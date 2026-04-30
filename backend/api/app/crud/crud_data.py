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
    
    # Resolve Prerequisites to unified codes once for the whole function
    resolved_prereqs = []
    if course.prerequisites:
        try:
            pr_list = json.loads(course.prerequisites) if isinstance(course.prerequisites, str) else course.prerequisites
            if isinstance(pr_list, list):
                for p in pr_list:
                    resolved_prereqs.append(resolve_course_code(db, p))
                resolved_prereqs = list(set(resolved_prereqs))
        except:
            pass
    prereq_json = json.dumps(resolved_prereqs) if resolved_prereqs else None

    if db_course:
        # If we resolved to a different code (e.g. name match or alias), 
        # ensure the incoming code is in the aliases list and the code is unified
        original_db_code = db_course.code
        try:
            aliases = json.loads(db_course.aliases) if db_course.aliases else [original_db_code]
            if course.code not in aliases:
                aliases.append(course.code)
                aliases.sort()
                new_unified_code = "/".join(aliases)
                
                # Check if we need to RENAME the Primary Key and move data
                if original_db_code != new_unified_code:
                    import re
                    joint_prefix = "/".join(sorted(list(set([re.match(r'^([A-Z]+)', c).group(1) for c in aliases if re.match(r'^([A-Z]+)', c)]))))
                    joint_number = db_course.number

                    # Collect all types from both courses into a JSON array
                    import json as _json
                    TYPE_PRIORITY = ["core", "math", "elective", "minor", "masters"]
                    def _parse_types(t: str) -> list:
                        try: return _json.loads(t) if t and t.startswith('[') else [t] if t else []
                        except: return [t] if t else []
                    combined_types = sorted(list(set(_parse_types(db_course.type) + _parse_types(course.type))),
                                          key=lambda t: TYPE_PRIORITY.index(t) if t in TYPE_PRIORITY else 99)
                    joint_type = _json.dumps(combined_types)

                    new_course = models.Course(
                        code=new_unified_code,
                        name=db_course.name,
                        prefix=joint_prefix,
                        number=joint_number,
                        type=joint_type,
                        study_plan=db_course.study_plan,
                        prerequisites=prereq_json,
                        is_math=db_course.is_math,
                        is_core=db_course.is_core,
                        course_level=db_course.course_level,
                        aliases=json.dumps(aliases)
                    )
                    db.add(new_course)
                    db.flush()

                    # 2. Move Offerings
                    db.query(models.CourseOffering).filter(models.CourseOffering.course_code == original_db_code).update({"course_code": new_unified_code})
                    
                    # 3. Update Schedules
                    db.query(models.ScheduleEntry).filter(models.ScheduleEntry.course_code == original_db_code).update({"course_code": new_unified_code})
                    
                    # 4. Update Prerequisite chains in OTHER courses
                    other_courses = db.query(models.Course).filter(models.Course.prerequisites.ilike(f'%{original_db_code}%')).all()
                    for oc in other_courses:
                        try:
                            pr = json.loads(oc.prerequisites)
                            pr = [p if p != original_db_code else new_unified_code for p in pr]
                            oc.prerequisites = json.dumps(list(set(pr)))
                        except: pass

                    # 5. Delete the old standalone course
                    db.delete(db_course)
                    db.commit()
                    
                    # Switch reference to the new one for the rest of the function
                    db_course = new_course
                    resolved_code = new_unified_code
                else:
                    # Just update the aliases list if code didn't change
                    db_course.aliases = json.dumps(aliases)
        except Exception as e:
            print(f"Inline Migration Error: {e}")
            db.rollback()

        db_course.name = course.name
        # If it's a unified course, derive prefix from code, else use single prefix
        if "/" in db_course.code:
            import re
            joint_prefix = "/".join(sorted(list(set([re.match(r'^([A-Z]+)', c.trim() if hasattr(c, "trim") else c.strip()).group(1) for c in db_course.code.split("/") if re.match(r'^([A-Z]+)', c.strip())]))))
            db_course.prefix = joint_prefix
            db_course.number = db_course.code.split("/")[0].replace(db_course.prefix.split("/")[0], "") # Fallback
        else:
            db_course.prefix = course.prefix
            db_course.number = course.number
        db_course.type = course.type
        db_course.study_plan = course.study_plan
        db_course.prerequisites = prereq_json
        db_course.is_math = course.is_math
        db_course.is_core = course.is_core
        db_course.course_level = course.course_level
    else:
        # New course creation
        course_data = course.model_dump()
        course_data["prerequisites"] = prereq_json
        db_course = models.Course(**course_data)
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
            db_off.fail_ratio = offering.fail_ratio
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

def create_audit_log(db: Session, table: str, action: str, desc: str, username: str = "System"):
    log = models.DataAuditLog(table_affected=table, action=action, description=desc, username=username)
    db.add(log)
    db.commit()

def create_action_log(db: Session, username: str, action: str, desc: str):
    log = models.ActionLog(username=username, action=action, description=desc)
    db.add(log)
    db.commit()
