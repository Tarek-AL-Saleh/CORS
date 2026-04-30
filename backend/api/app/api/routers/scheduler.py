from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from copy import deepcopy
import pandas as pd
from io import BytesIO
from fastapi.responses import StreamingResponse

from app.db.database import get_db
from app.db import models
from app.schemas import domain
from pydantic import BaseModel
from app.api.routers.auth import get_current_user
from app.crud.crud_data import create_action_log

router = APIRouter()

class ScheduleEntryCreate(BaseModel):
    course_code: str
    section_name: str
    doctor_id: Optional[int] = 0
    day: str  # MTWRF Pattern String
    start_time: str
    duration_mins: int
    room: Optional[str] = "TBD"

class ScheduleEntryResponse(ScheduleEntryCreate):
    id: int
    doctor: Optional[domain.DoctorMinimal] = None
    class Config:
        from_attributes = True

@router.get("/doctors", response_model=List[domain.DoctorResponse])
def get_doctors(db: Session = Depends(get_db)):
    return db.query(models.Doctor).all()

@router.post("/doctors", response_model=domain.DoctorResponse)
def create_doctor(doc: domain.DoctorBase, db: Session = Depends(get_db)):
    db_doc = models.Doctor(**doc.model_dump())
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@router.get("/", response_model=List[ScheduleEntryResponse])
def get_schedule(db: Session = Depends(get_db)):
    return db.query(models.ScheduleEntry).options(joinedload(models.ScheduleEntry.doctor)).all()

def time_to_mins(time_str: str):
    h, m = map(int, time_str.split(':'))
    return h * 60 + m

def is_time_conflicting(s1_str: str, d1: int, s2_str: str, d2: int):
    m1 = time_to_mins(s1_str)
    e1 = m1 + d1
    m2 = time_to_mins(s2_str)
    e2 = m2 + d2
    return m1 < e2 and m2 < e1

def days_overlap(d1: str, d2: str):
    return any(c in d2 for c in d1)

def minutes_to_time_str(mins: int):
    h = mins // 60
    m = mins % 60
    return f"{h:02d}:{m:02d}"

def check_doctor_availability(db: Session, doctor_id: int, pattern: str, start_time: str, duration_mins: int):
    """
    Validates that the course placement respects the doctor's availability constraints.
    - A day NOT listed in doctor_availability is considered UNCONSTRAINED (always available).
    - A day listed means the doctor is ONLY available in that specific time window.
    """
    course_start = time_to_mins(start_time)
    course_end = course_start + duration_mins

    availability_slots = db.query(models.DoctorAvailability).filter(
        models.DoctorAvailability.doctor_id == doctor_id
    ).all()

    # Build a map: individual day char -> availability slot
    day_constraints: dict = {}
    for slot in availability_slots:
        for day_char in slot.days.upper():
            day_constraints[day_char] = slot

    # Check each day in the pattern against constraints
    for day_char in pattern.upper():
        if day_char not in day_constraints:
            continue  # No record = no constraint → skip

        slot = day_constraints[day_char]
        avail_start = time_to_mins(slot.start)
        avail_end = time_to_mins(slot.end)

        if course_start < avail_start or course_end > avail_end:
            doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
            name = doctor.name if doctor else f"Doctor #{doctor_id}"
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Availability conflict: {name} is only available "
                    f"{slot.start}-{slot.end} on day '{day_char}', "
                    f"but this course runs {start_time}-{minutes_to_time_str(course_end)}."
                )
            )

@router.post("/", response_model=ScheduleEntryResponse)
def create_schedule_entry(entry: ScheduleEntryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 1. Check doctor availability constraints against doctor_availability table
    if entry.doctor_id and entry.doctor_id != 0:
        check_doctor_availability(db, entry.doctor_id, entry.day, entry.start_time, entry.duration_mins)

    # 2. Check schedule overlaps for doctor (no double-booking)
    if entry.doctor_id and entry.doctor_id != 0:
        doctor_entries = db.query(models.ScheduleEntry).filter(
            models.ScheduleEntry.doctor_id == entry.doctor_id
        ).all()
        
        for existing in doctor_entries:
            if days_overlap(entry.day, existing.day) and is_time_conflicting(entry.start_time, entry.duration_mins, existing.start_time, existing.duration_mins):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Doctor has a scheduling conflict on pattern {existing.day} at {existing.start_time}."
                )

    # 3. Check overlaps for room (across all days in pattern)
    if entry.room and entry.room.upper() != "TBD":
        room_entries = db.query(models.ScheduleEntry).filter(
            models.ScheduleEntry.room == entry.room
        ).all()
        
        for existing in room_entries:
            if days_overlap(entry.day, existing.day) and is_time_conflicting(entry.start_time, entry.duration_mins, existing.start_time, existing.duration_mins):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Room {entry.room} is occupied on pattern {existing.day} at {existing.start_time}."
                )

    entry_data = entry.model_dump()
    if entry_data.get("doctor_id") == 0:
        entry_data["doctor_id"] = None
        
    db_entry = models.ScheduleEntry(**entry_data)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    create_action_log(db, current_user.username, "SCHEDULE", f"Placed course {entry.course_code} {entry.section_name} in {entry.room} at {entry.start_time}")
    return db.query(models.ScheduleEntry).options(joinedload(models.ScheduleEntry.doctor)).filter(models.ScheduleEntry.id == db_entry.id).first()

# minutes_to_time_str is defined above check_doctor_availability

@router.delete("/{entry_id}")
def remove_schedule_entry(entry_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    entry = db.query(models.ScheduleEntry).filter(models.ScheduleEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(entry)
    db.commit()
    create_action_log(db, current_user.username, "SCHEDULE", f"Removed course {entry.course_code} from the schedule.")
    return {"status": "deleted"}

@router.patch("/{entry_id}", response_model=ScheduleEntryResponse)
def update_schedule_entry(entry_id: int, update_data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_entry = db.query(models.ScheduleEntry).filter(models.ScheduleEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Resolve effective values post-update
    new_dur    = update_data.get("duration_mins", db_entry.duration_mins)
    new_room   = update_data.get("room", db_entry.room)
    new_doc_id = update_data.get("doctor_id", db_entry.doctor_id)
    new_day    = update_data.get("day", db_entry.day)
    new_start  = update_data.get("start_time", db_entry.start_time)

    # 1. Check availability for new assignment
    if new_doc_id and new_doc_id != 0:
        check_doctor_availability(db, new_doc_id, new_day, new_start, new_dur)

    # 2. Re-check schedule conflicts (excluding self)
    if new_doc_id and new_doc_id != 0:
        dr_entries = db.query(models.ScheduleEntry).filter(
            models.ScheduleEntry.doctor_id == new_doc_id,
            models.ScheduleEntry.id != entry_id
        ).all()
        for existing in dr_entries:
            if days_overlap(new_day, existing.day) and is_time_conflicting(new_start, new_dur, existing.start_time, existing.duration_mins):
                raise HTTPException(status_code=400, detail=f"Instructor scheduling conflict with pattern {existing.day}.")

    if new_room and new_room.upper() != "TBD":
        rm_entries = db.query(models.ScheduleEntry).filter(
            models.ScheduleEntry.room == new_room,
            models.ScheduleEntry.id != entry_id
        ).all()
        for existing in rm_entries:
            if days_overlap(new_day, existing.day) and is_time_conflicting(new_start, new_dur, existing.start_time, existing.duration_mins):
                raise HTTPException(status_code=400, detail=f"Room conflict with pattern {existing.day}.")

    if "duration_mins" in update_data: db_entry.duration_mins = update_data["duration_mins"]
    if "room"          in update_data: db_entry.room          = update_data["room"]
    if "day"           in update_data: db_entry.day           = update_data["day"]
    if "start_time"    in update_data: db_entry.start_time    = update_data["start_time"]
    if "doctor_id"     in update_data: db_entry.doctor_id     = update_data["doctor_id"] if update_data["doctor_id"] != 0 else None
    
    db.commit()
    db.refresh(db_entry)
    create_action_log(db, current_user.username, "SCHEDULE", f"Modified schedule entry for {db_entry.course_code}.")
    return db.query(models.ScheduleEntry).options(joinedload(models.ScheduleEntry.doctor)).filter(models.ScheduleEntry.id == entry_id).first()

@router.get("/export")
def export_schedule(db: Session = Depends(get_db)):
    entries = db.query(models.ScheduleEntry).options(joinedload(models.ScheduleEntry.doctor)).all()
    
    data = []
    # Institutional order for abbreviations
    day_abbr_order = "MTWRFSU"
    
    for e in entries:
        start_mins = time_to_mins(e.start_time)
        
        # Sort characters in pattern string
        pattern = "".join(sorted(list(e.day), key=lambda c: day_abbr_order.find(c)))
        
        # Institutional Break Logic (Applied to primary day)
        effective_duration = e.duration_mins
        primary_char = pattern[0]
        if primary_char in "MWF" and e.duration_mins == 60:
            effective_duration = 50
        elif primary_char in "TR" and e.duration_mins == 90:
            effective_duration = 75
            
        end_time_str = minutes_to_time_str(start_mins + effective_duration)

        data.append({
            "Days Pattern": pattern,
            "Course Code": e.course_code,
            "Section Name": e.section_name,
            "Instructor": e.doctor.name if e.doctor else "Unassigned",
            "Start Time": e.start_time,
            "End Time": end_time_str,
            "Room": e.room
        })
    
    df = pd.DataFrame(data)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Final Schedule')
        worksheet = writer.sheets['Final Schedule']
        for idx, col in enumerate(df.columns):
            max_len = max(df[col].astype(str).map(len).max(), len(col)) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = max_len

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=cors_final_schedule.xlsx"}
    )
