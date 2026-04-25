import json
from sqlalchemy.orm import Session
from app.db import models
from app.schemas import domain
from typing import List

def resolve_course_code(db: Session, course_code: str, course_name: str = None):
    # 1. Try exact match first
    res = db.query(models.Course).filter(models.Course.code == course_code).first()
    if res:
        return course_code
    
    # 2. Try alias match
    courses_with_aliases = db.query(models.Course).filter(models.Course.aliases.isnot(None)).all()
    for c in courses_with_aliases:
        try:
            aliases = json.loads(c.aliases)
            if course_code in aliases:
                return c.code
        except:
            continue
            
    # 3. Try name-based match (Self-Healing)
    if course_name:
        clean_target = ''.join(e for e in course_name if e.isalnum()).lower()
        # For performance, we'll check courses with similar names
        # But for robustness as requested, we check all
        all_courses = db.query(models.Course).all()
        for c in all_courses:
            clean_c = ''.join(e for e in c.name if e.isalnum()).lower()
            if clean_c == clean_target:
                return c.code

    return course_code

def get_db_course(db: Session, course_code: str):
    return db.query(models.Course).filter(models.Course.code == course_code).first()

def upsert_course(db: Session, course: domain.CourseBase):
    resolved_code = resolve_course_code(db, course.code, course.name)
    db_course = get_db_course(db, resolved_code)
    
    if db_course:
        # If we resolved to a different code (e.g. name match or alias), 
        # ensure the incoming code is in the aliases list
        if resolved_code != course.code:
            try:
                aliases = json.loads(db_course.aliases) if db_course.aliases else []
                if course.code not in aliases:
                    aliases.append(course.code)
                    aliases.sort()
                    db_course.aliases = json.dumps(aliases)
                    # If we just added a new alias, maybe update the ID to the unified format
                    new_unified_code = "/".join(aliases)
                    if db_course.code != new_unified_code:
                        # This is a bit tricky since CODE is a primary key.
                        # We'll stick to the existing resolved_code for now to avoid PK mutation issues
                        # or just keep it as is. The migration script will clean it up on next boot.
                        pass
            except:
                pass

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
    resolved_code = resolve_course_code(db, offering.course_code)
    db_off = get_offering(db, offering.year, offering.semester, offering.campus, resolved_code)
    
    if db_off:
        # If we are upserting and it's a unified code, we might want to ADD to it 
        # but the current architecture of 'upsert' usually implies 'overwrite'
        # To be safe for cross-listed courses being uploaded separately, we should probably merge.
        # However, if the upload script itself does grouping, overwrite is fine.
        # The upload script in data_management.py iterates row by row.
        # If CSC243 and BIF243 are in the same file, row 1 (CSC243) will set values.
        # Row 2 (BIF243) will then OVERWRITE them if we don't ADD.
        
        # Check if it is a unified course (contains /)
        if "/" in resolved_code:
            db_off.total_enrolled += offering.total_enrolled
            db_off.passed_count += offering.passed_count
            db_off.failed_count += offering.failed_count
            
            # Recalculate fail ratio
            if db_off.total_enrolled > 0:
                db_off.fail_ratio = float(db_off.failed_count / db_off.total_enrolled)
            else:
                db_off.fail_ratio = 0.0
            
            db_off.is_offered = db_off.is_offered or offering.is_offered
        else:
            db_off.total_enrolled = offering.total_enrolled
            db_off.passed_count = offering.passed_count
            db_off.failed_count = offering.failed_count
            db_off.is_offered = offering.is_offered
            
            # Standardize fail ratio for standalone courses too
            if db_off.total_enrolled > 0:
                db_off.fail_ratio = float(db_off.failed_count / db_off.total_enrolled)
            else:
                db_off.fail_ratio = 0.0
    else:
        # Ensure the code used is the resolved one
        off_data = offering.model_dump()
        off_data["course_code"] = resolved_code
        db_off = models.CourseOffering(**off_data)
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
