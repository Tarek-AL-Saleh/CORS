import json
import pandas as pd
from typing import List
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db import models
from app.crud import crud_data
from app.schemas import domain

router = APIRouter()

@router.get("/courses", response_model=List[domain.CourseResponse])
def list_courses(db: Session = Depends(get_db)):
    return crud_data.get_all_courses(db)

@router.get("/offerings", response_model=List[domain.CourseOfferingResponse])
def list_offerings(db: Session = Depends(get_db)):
    return crud_data.get_all_offerings(db)

@router.post("/upload/courses")
async def upload_course_index(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Must be a JSON file")
    
    content = await file.read()
    try:
        data = json.loads(content)
        courses_to_process = []
        
        # If the root is a dictionary, determine if it's a wrapper or a key-value store of courses
        if isinstance(data, dict):
            found_list = False
            for val in data.values():
                if isinstance(val, list):
                    courses_to_process = val
                    found_list = True
                    break
            
            if not found_list:
                # Assume Dictionary format {"CSC201": {"course_name": ...}}
                for key, val in data.items():
                    if isinstance(val, dict):
                        val["code"] = key
                        courses_to_process.append(val)
        elif isinstance(data, list):
            courses_to_process = data

        count = 0
        for item in courses_to_process:
            if not isinstance(item, dict):
                continue
            
            c_code = item.get("code", "").upper().replace(" ", "")
            if not c_code: continue
            
            # Simple heuristic for prefix/number
            import re
            match = re.match(r"([A-Z]+)(\d+)", c_code)
            prefix = match.group(1) if match else "GEN"
            number = match.group(2) if match else "100"

            c_type = item.get("type", "Elective")
            is_core = c_type.lower() == "core"
            is_math = "MATH" in prefix or "STA" in prefix
            level = int(number[0]) if number.isdigit() and len(number) > 0 else 1

            # Prerequisites
            prereqs = item.get("prerequisites")
            prereq_str = json.dumps(prereqs) if isinstance(prereqs, list) else None

            c_name = item.get("course_name", item.get("name", "Unknown"))
            
            cb = domain.CourseBase(
                code=c_code,
                name=c_name,
                prefix=prefix,
                number=number,
                type=c_type,
                study_plan=item.get("study_plan"),
                prerequisites=prereq_str,
                is_math=is_math,
                is_core=is_core,
                course_level=level
            )
            crud_data.upsert_course(db, cb)
            count += 1
            
        if count == 0:
            raise HTTPException(status_code=400, detail="0 courses processed. Check if your JSON has a 'code' field.")
        crud_data.create_audit_log(db, "courses", "UPLOAD", f"Uploaded course index: {count} courses processed.")
        return {"status": "success", "processed": count}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/offerings")
async def upload_offerings(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx')):
        raise HTTPException(status_code=400, detail="Must be a CSV or XLSX file")
    
    try:
        import os, sys, tempfile
        # Create a temp file to hold the upload safely
        fd, temp_file_path = tempfile.mkstemp(suffix=".xlsx" if file.filename.endswith('.xlsx') else ".csv")
        with os.fdopen(fd, 'wb') as f:
            f.write(file.file.read())

        if file.filename.endswith('.csv'):
            df = pd.read_csv(temp_file_path)
        else:
            # According to user constraints: .xlsx implies the Raw format from university reports
            try:
                from app.services.data_cleaner import process_course_offerings
                df = process_course_offerings(temp_file_path)
            except Exception as e:
                # If data_cleaner fails, fallback to simple excel read just in case
                df = pd.read_excel(temp_file_path)
        
        # Cleanup temp file
        try: os.remove(temp_file_path)
        except: pass

        # Normalize column names for extremely resilient parsing
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        count = 0
        for _, row in df.iterrows():
            # Try multiple column name variations for course code
            c_code = str(row.get("course_code", row.get("course code", row.get("course", "")))).upper().replace(" ", "")
            
            # If no direct course code, try prefix + number
            if not c_code or c_code == "":
                prefix = str(row.get("course_prefix", row.get("prefix", ""))).upper().strip()
                number = str(row.get("course_num", row.get("number", row.get("course_number", "")))).strip()
                if prefix and number:
                    c_code = prefix + number

            y_raw = row.get("year", row.get("yr", 0))
            if pd.isna(y_raw): continue
            try:
                y = int(y_raw)
            except:
                y = 0
            
            if not c_code or not y: continue

            # Expected columns with multiple format fallbacks including data_cleaner's named columns
            enrolled = int(row.get("total_enrolled", row.get("total enrolled", row.get("enrolled", row.get("total", 0)))))
            passed = int(row.get("passed_count", row.get("passed", row.get("pass", 0))))
            failed = int(row.get("failed_count", row.get("failed", row.get("fail", 0))))
            fail_ratio = float(row.get("fail_ratio", row.get("failure_rate", 0.0)))
            
            if enrolled > 0 and fail_ratio == 0:
                fail_ratio = float(failed / enrolled)
            
            is_off = bool(row.get("is_offered", row.get("is offered", row.get("offered", True))))

            ob = domain.CourseOfferingBase(
                year=y,
                semester=str(row.get("semester", row.get("term", row.get("sem", "Fall")))).capitalize(),
                campus=str(row.get("campus", "Beirut")).capitalize(),
                course_code=c_code,
                total_enrolled=enrolled,
                passed_count=passed,
                failed_count=failed,
                fail_ratio=fail_ratio,
                is_offered=is_off
            )
            crud_data.upsert_offering(db, ob)
            count += 1
            
        if count == 0:
            raise HTTPException(status_code=400, detail="0 offerings processed. Please ensure your file has valid 'Year' and 'Course Code' (or 'Prefix' and 'Number') columns.")
        crud_data.create_audit_log(db, "course_offerings", "UPLOAD", f"Uploaded history: {count} records processed.")
        return {"status": "success", "processed": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/doctors")
async def upload_doctors(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not (file.filename.endswith('.json') or file.filename.endswith('.csv') or file.filename.endswith('.xlsx')):
        raise HTTPException(status_code=400, detail="Must be a JSON, CSV, or XLSX file")
    
    try:
        doctors_to_process = []
        
        if file.filename.endswith('.json'):
            content = await file.read()
            data = json.loads(content)
            if isinstance(data, list):
                doctors_to_process = data
            elif isinstance(data, dict):
                # Check for a "doctors" or "faculty" key
                if "doctors" in data: doctors_to_process = data["doctors"]
                elif "faculty" in data: doctors_to_process = data["faculty"]
                else:
                    # Treat dict as a collection of name: metadata
                    for name, meta in data.items():
                        if isinstance(meta, dict):
                            meta["name"] = name
                            doctors_to_process.append(meta)
                        else:
                            doctors_to_process.append({"name": name})
        else:
            # Excel / CSV
            import os, tempfile
            fd, temp_file_path = tempfile.mkstemp(suffix=".xlsx" if file.filename.endswith('.xlsx') else ".csv")
            with os.fdopen(fd, 'wb') as f:
                f.write(file.file.read())
            
            if file.filename.endswith('.csv'):
                df = pd.read_csv(temp_file_path)
            else:
                df = pd.read_excel(temp_file_path)
            
            try: os.remove(temp_file_path)
            except: pass
            
            df.columns = [str(c).strip().lower() for c in df.columns]
            for _, row in df.iterrows():
                name = str(row.get("name", row.get("doctor_name", row.get("professor", "")))).strip()
                course_raw = str(row.get("allowed_courses", row.get("courses", ""))).strip()
                days = str(row.get("days", row.get("day", ""))).strip()
                start = str(row.get("start", row.get("start_time", ""))).strip()
                end = str(row.get("end", row.get("end_time", ""))).strip()
                
                courses = []
                if course_raw and course_raw.lower() != 'nan':
                    courses = [c.strip().upper() for c in course_raw.split(',') if c.strip()]
                
                availability = []
                if days and start and end:
                    availability = [f"{days} {start} {end}"]

                if name:
                    doctors_to_process.append({
                        "name": name, 
                        "courses": courses,
                        "availability": availability
                    })

        count = 0
        for doc in doctors_to_process:
            if not isinstance(doc, dict): continue
            db_doc = crud_data.upsert_doctor(db, doc)
            if db_doc: count += 1
            
        crud_data.create_audit_log(db, "doctors", "UPLOAD", f"Uploaded faculty: {count} records processed.")
        return {"status": "success", "processed": count}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
