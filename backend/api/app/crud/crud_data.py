import json
from sqlalchemy.orm import Session
from app.db import models
from app.schemas import domain
from typing import List

def get_db_course(db: Session, course_code: str):
    return db.query(models.Course).filter(models.Course.code == course_code).first()

def upsert_course(db: Session, course: domain.CourseBase):
    db_course = get_db_course(db, course.code)
    if db_course:
        db_course.name = course.name
        db_course.prefix = course.prefix
        db_course.number = course.number
        db_course.type = course.type
        db_course.study_plan = course.study_plan
        db_course.prerequisites = course.prerequisites
        db_course.is_math = course.is_math
        db_course.is_core = course.is_core
        db_course.course_level = course.course_level
    else:
        db_course = models.Course(**course.model_dump())
        db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

def get_offering(db: Session, year: int, semester: str, campus: str, course_code: str):
    return db.query(models.CourseOffering).filter(
        models.CourseOffering.year == year,
        models.CourseOffering.semester == semester,
        models.CourseOffering.campus == campus,
        models.CourseOffering.course_code == course_code
    ).first()

def upsert_offering(db: Session, offering: domain.CourseOfferingBase):
    db_off = get_offering(db, offering.year, offering.semester, offering.campus, offering.course_code)
    if db_off:
        db_off.total_enrolled = offering.total_enrolled
        db_off.passed_count = offering.passed_count
        db_off.failed_count = offering.failed_count
        db_off.fail_ratio = offering.fail_ratio
        db_off.is_offered = offering.is_offered
    else:
        db_off = models.CourseOffering(**offering.model_dump())
        db.add(db_off)
    db.commit()
    return db_off

def get_all_courses(db: Session):
    return db.query(models.Course).all()

def get_all_offerings(db: Session):
    return db.query(models.CourseOffering).all()

def get_doctor_by_name(db: Session, name: str):
    return db.query(models.Doctor).filter(models.Doctor.name == name).first()

def upsert_doctor(db: Session, doc_data: dict):
    from fastapi import HTTPException
    name = doc_data.get("name", "Unknown").strip()
    if not name: return None
    
    # 1. Validation for Day Uniqueness
    availability_list = doc_data.get("availability", [])
    seen_days = set()
    parsed_slots = []
    
    for slot_str in availability_list:
        parts = slot_str.split()
        if len(parts) < 3: continue
        
        days_pattern = parts[0].upper()
        start_time = parts[1]
        end_time = parts[2]
        
        # Check for duplicate day characters
        for char in days_pattern:
            if char in seen_days:
                raise HTTPException(status_code=400, detail=f"Data inconsistency: Day '{char}' is assigned to multiple availability slots for {name}.")
            seen_days.add(char)
        
        parsed_slots.append({
            "days": days_pattern,
            "start": start_time,
            "end": end_time
        })

    # 2. Sync Doctor Record
    db_doc = db.query(models.Doctor).filter(models.Doctor.name == name).first()
    if not db_doc:
        db_doc = models.Doctor(
            name=name, 
            allowed_courses=json.dumps(doc_data.get("courses", [])) if doc_data.get("courses") else None
        )
        db.add(db_doc)
    else:
        if "courses" in doc_data:
            db_doc.allowed_courses = json.dumps(doc_data["courses"])
    
    db.commit()
    db.refresh(db_doc)

    # 3. Sync Availability (Wipe and Replace)
    db.query(models.DoctorAvailability).filter(models.DoctorAvailability.doctor_id == db_doc.id).delete()
    
    for slot in parsed_slots:
        db_availability = models.DoctorAvailability(
            doctor_id=db_doc.id,
            days=slot["days"],
            start=slot["start"],
            end=slot["end"]
        )
        db.add(db_availability)
    
    db.commit()
    db.refresh(db_doc)
    return db_doc

def create_audit_log(db: Session, table: str, action: str, desc: str):
    log = models.DataAuditLog(table_affected=table, action=action, description=desc)
    db.add(log)
    db.commit()
