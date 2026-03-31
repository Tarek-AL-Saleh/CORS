from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from copy import deepcopy

from app.db.database import get_db
from app.db import models
from app.schemas import domain
from pydantic import BaseModel

router = APIRouter()

class ScheduleEntryCreate(BaseModel):
    course_code: str
    section_name: str
    doctor_id: int
    day: str
    start_time: str
    duration_mins: int
    room: str

class ScheduleEntryResponse(ScheduleEntryCreate):
    id: int
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
    return db.query(models.ScheduleEntry).all()

@router.post("/", response_model=ScheduleEntryResponse)
def create_schedule_entry(entry: ScheduleEntryCreate, db: Session = Depends(get_db)):
    # Simple Conflict Check: Is doctor free?
    doctor = db.query(models.Doctor).filter(models.Doctor.id == entry.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Check overlaps for doctor
    overlaps = db.query(models.ScheduleEntry).filter(
        models.ScheduleEntry.doctor_id == entry.doctor_id,
        models.ScheduleEntry.day == entry.day,
        models.ScheduleEntry.start_time == entry.start_time
    ).first()
    
    if overlaps:
        raise HTTPException(status_code=400, detail="Doctor is already teaching at this time.")

    db_entry = models.ScheduleEntry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.delete("/{entry_id}")
def remove_schedule_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.ScheduleEntry).filter(models.ScheduleEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(entry)
    db.commit()
    return {"status": "deleted"}

@router.patch("/{entry_id}", response_model=ScheduleEntryResponse)
def update_schedule_entry(entry_id: int, update_data: dict, db: Session = Depends(get_db)):
    db_entry = db.query(models.ScheduleEntry).filter(models.ScheduleEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Conflict check for new doctor/time if provided
    new_doc_id = update_data.get("doctor_id")
    if new_doc_id:
        overlaps = db.query(models.ScheduleEntry).filter(
            models.ScheduleEntry.doctor_id == new_doc_id,
            models.ScheduleEntry.day == db_entry.day,
            models.ScheduleEntry.start_time == db_entry.start_time,
            models.ScheduleEntry.id != entry_id
        ).first()
        if overlaps:
            raise HTTPException(status_code=400, detail="Doctor is already teaching at this time elsewhere.")
        db_entry.doctor_id = new_doc_id

    if "room" in update_data:
        db_entry.room = update_data["room"]
    
    db.commit()
    db.refresh(db_entry)
    return db_entry
