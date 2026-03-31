import math
from typing import List, Dict, Any
from app.db import models
from sqlalchemy.orm import Session

class SectionPlanner:
    def __init__(self, db: Session):
        self.db = db
        self.max_students_per_sec = 30

    def calculate_sections(self, course: models.Course, projected_demand: int) -> int:
        if projected_demand <= 0:
            return 0
        return math.ceil(projected_demand / self.max_students_per_sec)

    def plan_predictions(self, predictions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        # Predictions look like:
        # [{"course_code": "CSC320", "offer": True, "latent_demand": 45, "offer_score": 88.0, "confidence": 0.9, ...}]
        
        planned_results = []
        tech_electives_pool = []
        
        for p in predictions:
            course = self.db.query(models.Course).filter(models.Course.code == p["course_code"]).first()
            if not course:
                continue

            demand = p["latent_demand"]
            sections = self.calculate_sections(course, demand) if p["offer"] else 0
            
            p["projected_sections"] = sections
            p["is_tech_elective_pool"] = False

            if p["offer"] and course.type.lower() == "elective" and sections > 0:
                p["is_tech_elective_pool"] = True
                tech_electives_pool.append(p)
            else:
                planned_results.append(p)
        
        # Merge Tech Electives logic
        # the user requested: we usually don't open 2 sections of a single tech elective.
        # we pool demand and rename them as CS tech elective 1, 2, 3...
        
        if tech_electives_pool:
            total_elective_demand = sum([e["latent_demand"] for e in tech_electives_pool])
            total_sections_needed = math.ceil(total_elective_demand / self.max_students_per_sec)

            # Sort descending by offer score so we offer the top ones
            tech_electives_pool.sort(key=lambda x: x["offer_score"], reverse=True)

            # Assign 1 section per highly ranked elective until we satiate total sections
            for i in range(total_sections_needed):
                idx = i % len(tech_electives_pool)
                # Just bump their assigned projected_sections
                tech_electives_pool[idx]["projected_sections"] = 1
            
            # Reinsert to results
            for e in tech_electives_pool:
                if e["projected_sections"] > 0:
                    planned_results.append(e)

        return planned_results
