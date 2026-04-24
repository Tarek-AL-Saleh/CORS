import json
from sqlalchemy import text
from app.db.database import SessionLocal
from app.db import models

def setup_schema(db):
    try:
        db.execute(text('ALTER TABLE courses ADD COLUMN aliases TEXT'))
        db.commit()
        print("Schema altered successfully: Added aliases column.")
    except Exception as e:
        db.rollback()
        print("Column may already exist:", e)

def run_migration():
    db = SessionLocal()
    setup_schema(db)
    
    # Clean DB of stale ML metrics that are now invalid
    print("Clearing stale ML pipeline logs (Predictions & Training Records)")
    db.query(models.PredictionEntry).delete()
    db.query(models.PredictionRun).delete()
    db.query(models.TrainingRecord).delete()
    db.commit()
    
    courses = db.query(models.Course).all()
    
    # 1. Group courses by normalized name
    name_groups = {}
    for c in courses:
        clean_name = ''.join(e for e in c.name if e.isalnum()).lower()
        if clean_name not in name_groups:
            name_groups[clean_name] = []
        name_groups[clean_name].append(c)

    courses_to_delete = []
    
    code_migration_map = {}

    for clean_name, group in name_groups.items():
        if len(group) == 1:
            continue
            
        group.sort(key=lambda x: x.code)
        codes = [c.code for c in group]
        golden_code = "/".join(codes)
        print(f"Migrating {codes} -> {golden_code}")
        
        for c in codes:
            code_migration_map[c] = golden_code
            
        primary = group[0]
        
        # Merge prerequisites
        merged_prereqs = set()
        for c in group:
            if c.prerequisites:
                try:
                    pr = json.loads(c.prerequisites)
                    merged_prereqs.update(pr)
                except:
                    pass
                    
        # Create Golden Course
        golden_course = models.Course(
            code=golden_code,
            name=primary.name,
            prefix=primary.prefix,
            number=primary.number,
            type=primary.type,
            study_plan=primary.study_plan,
            prerequisites=json.dumps(list(merged_prereqs)) if merged_prereqs else None,
            is_math=primary.is_math,
            is_core=primary.is_core,
            course_level=primary.course_level,
            aliases=json.dumps(codes)
        )
        db.add(golden_course)
        db.commit()
        
        # Merge offerings
        offerings = db.query(models.CourseOffering).filter(models.CourseOffering.course_code.in_(codes)).all()
        # Group by year, semester, campus
        off_map = {}
        for off in offerings:
            key = (off.year, off.semester, off.campus)
            if key not in off_map:
                off_map[key] = {
                    'total_enrolled': 0, 'passed': 0, 'failed': 0, 'is_off': off.is_offered
                }
            off_map[key]['total_enrolled'] += off.total_enrolled
            off_map[key]['passed'] += off.passed_count
            off_map[key]['failed'] += off.failed_count
            # if any was offered, it is considered offered
            off_map[key]['is_off'] = off_map[key]['is_off'] or off.is_offered
            
            db.delete(off)
            
        db.commit()
        
        # Create new united offerings
        for (y, s, c), data in off_map.items():
            fr = float(data['failed'] / data['total_enrolled']) if data['total_enrolled'] > 0 else 0.0
            new_off = models.CourseOffering(
                year=y, semester=s, campus=c, course_code=golden_code,
                total_enrolled=data['total_enrolled'],
                passed_count=data['passed'], failed_count=data['failed'],
                fail_ratio=fr, is_offered=data['is_off']
            )
            db.add(new_off)
        
        db.commit()
        
        # Store for deletion later
        for c in group:
            courses_to_delete.append(c)

    # 2. Update ALL existing courses that might have these mapped items as prerequisites
    print("Updating transitive prerequisites...")
    all_courses_refresh = db.query(models.Course).all()
    for c in all_courses_refresh:
        if c.prerequisites:
            try:
                pr = json.loads(c.prerequisites)
                changed = False
                new_pr = []
                for p in pr:
                    if p in code_migration_map:
                        new_pr.append(code_migration_map[p])
                        changed = True
                    else:
                        new_pr.append(p)
                if changed:
                    # deduplicate
                    c.prerequisites = json.dumps(list(set(new_pr)))
                    db.add(c)
            except:
                pass
                
    db.commit()
    
    # 3. Update any explicit schedule entries holding old values
    print("Updating scheduling constraints...")
    schedules = db.query(models.ScheduleEntry).all()
    for sc in schedules:
        if sc.course_code in code_migration_map:
            sc.course_code = code_migration_map[sc.course_code]
            db.add(sc)
            
    db.commit()

    # 4. Delete old standalone courses
    print("Flushing old standalone courses...")
    for c in courses_to_delete:
        db.delete(c)
    db.commit()
    
    db.close()
    print("Migration Complete!")

if __name__ == '__main__':
    run_migration()
