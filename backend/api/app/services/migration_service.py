import json
from sqlalchemy.orm import Session
from app.db import models

def run_course_unification(db: Session):
    """
    Finds courses with identical names and merges them into unified entities.
    Idempotent: Only acts if multiple courses share the same normalized name.
    """
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
    migration_occurred = False

    for clean_name, group in name_groups.items():
        if len(group) <= 1:
            continue
            
        migration_occurred = True
        group.sort(key=lambda x: x.code)
        codes = [c.code for c in group]
        golden_code = "/".join(codes)
        print(f"[Migration] Unifying {codes} -> {golden_code}")
        
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
                    
        # Create or Update Golden Course
        golden_course = db.query(models.Course).filter(models.Course.code == golden_code).first()
        if not golden_course:
            import re
            joint_prefix = "/".join(sorted(list(set([re.match(r'^([A-Z]+)', c).group(1) for c in codes if re.match(r'^([A-Z]+)', c)]))))
            
            # Collect all types from group into a JSON array
            TYPE_PRIORITY = ["core", "math", "elective", "minor", "masters"]
            def _parse_types(t: str) -> list:
                try: return json.loads(t) if t and t.startswith('[') else [t] if t else []
                except: return [t] if t else []
            all_types = sorted(list(set(t for c in group for t in _parse_types(c.type))),
                               key=lambda t: TYPE_PRIORITY.index(t) if t in TYPE_PRIORITY else 99)
            joint_type = json.dumps(all_types)

            golden_course = models.Course(
                code=golden_code,
                name=primary.name,
                prefix=joint_prefix,
                number=primary.number,
                type=joint_type,
                study_plan=primary.study_plan,
                prerequisites=json.dumps(list(merged_prereqs)) if merged_prereqs else None,
                is_math=primary.is_math,
                is_core=primary.is_core,
                course_level=primary.course_level,
                aliases=json.dumps(codes)
            )
            db.add(golden_course)
            db.flush()
        
        # Merge offerings
        offerings = db.query(models.CourseOffering).filter(models.CourseOffering.course_code.in_(codes)).all()
        off_map = {}
        for off in offerings:
            key = (off.year, off.semester, off.campus)
            if key not in off_map:
                off_map[key] = {'total': 0, 'passed': 0, 'failed': 0, 'is_off': off.is_offered}
            
            off_map[key]['total'] += off.total_enrolled
            off_map[key]['passed'] += off.passed_count
            off_map[key]['failed'] += off.failed_count
            off_map[key]['is_off'] = off_map[key]['is_off'] or off.is_offered
            db.delete(off)
            
        for (y, s, camp), data in off_map.items():
            fr = float(data['failed'] / data['total']) if data['total'] > 0 else 0.0
            new_off = models.CourseOffering(
                year=y, semester=s, campus=camp, course_code=golden_code,
                total_enrolled=data['total'], passed_count=data['passed'],
                failed_count=data['failed'], fail_ratio=fr, is_offered=data['is_off']
            )
            db.add(new_off)
        
        for c in group:
            courses_to_delete.append(c)

    if not migration_occurred:
        return

    # 2. Update transitive prerequisites
    print("[Migration] Updating transitive prerequisite chains...")
    all_courses = db.query(models.Course).all()
    for c in all_courses:
        if c.prerequisites:
            try:
                pr = json.loads(c.prerequisites)
                new_pr = [code_migration_map.get(p, p) for p in pr]
                if set(new_pr) != set(pr):
                    c.prerequisites = json.dumps(list(set(new_pr)))
                    db.add(c)
            except: pass
                
    # 3. Update schedules
    print("[Migration] Updating schedule entries...")
    schedules = db.query(models.ScheduleEntry).all()
    for sc in schedules:
        if sc.course_code in code_migration_map:
            sc.course_code = code_migration_map[sc.course_code]
            db.add(sc)
            
    # 4. Flush stale ML data ONLY if migration occurred
    print("[Migration] Clearing stale ML logs due to structural changes...")
    db.query(models.PredictionEntry).delete()
    db.query(models.PredictionRun).delete()
    db.query(models.TrainingRecord).delete()

    # 5. Delete standalone courses
    for c in courses_to_delete:
        db.delete(c)
    
    db.commit()
    print("[Migration] Structural unification complete.")
