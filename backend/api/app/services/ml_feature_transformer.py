import json
import pandas as pd
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db import models

class FeatureTransformer:
    def __init__(self, db: Session):
        self.db = db
        # Pre-load courses for quick lookup
        self.courses = {c.code: c for c in db.query(models.Course).all()}
        self.offerings = db.query(models.CourseOffering).all()
        # Build DataFrame for pandas operations
        self.off_df = pd.DataFrame([
            {
                "year": o.year,
                "semester": o.semester,
                "campus": o.campus,
                "course_code": o.course_code,
                "passed_count": o.passed_count,
                "failed_count": o.failed_count,
                "fail_ratio": o.fail_ratio,
                "is_offered": o.is_offered,
                "total_enrolled": o.total_enrolled
            }
            for o in self.offerings
        ])

        # Build inverse prerequisite map (Adjacency List) for Transitive Closure
        self.adj = {c: [] for c in self.courses.keys()}
        for c_code, c_obj in self.courses.items():
            try:
                prers = json.loads(c_obj.prerequisites) if c_obj.prerequisites else []
                for p in prers:
                    if p in self.adj:
                        self.adj[p].append(c_code)
            except: pass

    def _get_past_terms(self, current_year: int, current_sem: str, N: int = 1) -> List[tuple]:
        # Simple term lookback: Summer -> Spring -> Fall -> Summer
        order = {"Fall": 3, "Summer": 2, "Spring": 1}
        reversed_order = {3: "Fall", 2: "Summer", 1: "Spring"}
        
        terms = []
        y = current_year
        val = order.get(current_sem, 3)
        for _ in range(N):
            val -= 1
            if val == 0:
                val = 3
                y -= 1
            terms.append((y, reversed_order[val]))
        return terms

    def _calc_latent_demand(self, course_code: str, campus: str, current_year: int, current_semester: str, new_enrollees: int) -> int:
        course = self.courses.get(course_code)
        if not course or not course.prerequisites:
            return 0
        try:
            prereqs = json.loads(course.prerequisites)
        except:
            prereqs = []
        if not prereqs or self.off_df.empty:
            return new_enrollees
        

        past_2_terms = self._get_past_terms(current_year, current_semester, N=2)
        total_passed = 0
        for p_code in prereqs:
            for (y, s) in past_2_terms:
                match = self.off_df[
                    (self.off_df['course_code'] == p_code) & 
                    (self.off_df['campus'] == campus) & 
                    (self.off_df['year'] == y) & 
                    (self.off_df['semester'] == s)
                ]
                if not match.empty:
                    total_passed += int(match['passed_count'].sum())
        return total_passed

    def _calc_avg_fail_ratio_3y(self, course_code: str, campus: str, current_year: int) -> float:
        if self.off_df.empty: return 0.0
        mask = (self.off_df['course_code'] == course_code) & (self.off_df['campus'] == campus) & \
               (self.off_df['year'] >= current_year - 3) & (self.off_df['year'] < current_year)
        filtered = self.off_df[mask]
        if filtered.empty: return 0.0
        return float(filtered['fail_ratio'].mean())

    def _calc_recent_fail(self, course_code: str, campus: str, current_year: int, current_sem: str) -> int:
        if self.off_df.empty: return 0
        past_term = self._get_past_terms(current_year, current_sem, N=1)[0]
        mask = (self.off_df['course_code'] == course_code) & (self.off_df['campus'] == campus) & \
               (self.off_df['year'] == past_term[0]) & (self.off_df['semester'] == past_term[1])
        match = self.off_df[mask]
        if not match.empty:
            return int(match['failed_count'].sum())
        return 0

    def _is_offered_last_year(self, course_code: str, campus: str, current_year: int, current_sem: str) -> int:
        if self.off_df.empty: return 0
        mask = (self.off_df['course_code'] == course_code) & \
               (self.off_df['campus'] == campus) & \
               (self.off_df['year'] == current_year - 1) & \
               (self.off_df['semester'] == current_sem) & \
               (self.off_df['is_offered'] == True)
        return 1 if not self.off_df[mask].empty else 0

    def _gap_since_offered(self, course_code: str, campus: str, current_year: int, current_sem: str) -> int:
        if self.off_df.empty: return 99
        
        order = {"Fall": 3, "Summer": 2, "Spring": 1}
        current_sem_order = order.get(current_sem, 3)
        
        mask = (self.off_df['course_code'] == course_code) & \
               (self.off_df['campus'] == campus) & \
               (self.off_df['is_offered'] == True) & \
               ((self.off_df['year'] < current_year) | 
                ((self.off_df['year'] == current_year) & (self.off_df['semester'].map(order) < current_sem_order)))
               
        offered = self.off_df[mask]
        if offered.empty: return 99
        
        # Sort by year desc, then term desc
        s = offered.assign(sem_order=offered['semester'].map(order)).sort_values(by=['year', 'sem_order'], ascending=[False, False]).iloc[0]
        
        gap_years = current_year - s['year']
        gap_terms = gap_years * 3 
        gap_terms += (current_sem_order - order.get(s['semester'], 3))
        return max(1, gap_terms)

    def _calc_bottleneck_score(self, course_code: str) -> int:
        # Recursive Transitive Closure: How many courses in total rely on this course?
        descendants = set()
        stack = list(self.adj.get(course_code, []))
        while stack:
            curr = stack.pop()
            if curr not in descendants:
                descendants.add(curr)
                # Add all courses that depend on 'curr'
                stack.extend(self.adj.get(curr, []))
        return len(descendants)

    def build_feature_vector(self, course_code: str, year: int, semester: str, campus: str, new_enrollees: int) -> Dict[str, Any]:
        course = self.courses.get(course_code)
        if not course:
            raise ValueError(f"Course {course_code} not found in DB")

        latent = self._calc_latent_demand(course_code, campus, year, semester, new_enrollees)
        bottleneck = self._calc_bottleneck_score(course_code)
        align = 1.0 if course.study_plan and course.study_plan.lower() in [semester.lower(), "both"] else 0.0

        return {
            "is_core": 1 if course.is_core else 0,
            "is_math": 1 if course.is_math else 0,
            "avg_fail_ratio_3y": float(self._calc_avg_fail_ratio_3y(course_code, campus, year)),
            "recent_fail_count": int(self._calc_recent_fail(course_code, campus, year, semester)),
            "is_offered_last_year": int(self._is_offered_last_year(course_code, campus, year, semester)),
            "latent_demand_count": int(latent),
            "bottleneck_score": int(bottleneck),
            "plan_alignment_score": float(align),
            "course_level": int(course.course_level),
            "gap_since_last_offered": int(self._gap_since_offered(course_code, campus, year, semester)),
            "semester_Fall": 1 if semester == "Fall" else 0,
            "semester_Spring": 1 if semester == "Spring" else 0,
            "semester_Summer": 1 if semester == "Summer" else 0,
        }

    def predict_payload(self, course_code: str, year: int, semester: str, campus: str, new_enrollees: int) -> list:
        # Output strictly in the order of the model training
        vec = self.build_feature_vector(course_code, year, semester, campus, new_enrollees)
        keys = [
            "is_core", "is_math", "avg_fail_ratio_3y", "recent_fail_count",
            "is_offered_last_year", "latent_demand_count", "bottleneck_score",
            "plan_alignment_score", "course_level", "gap_since_last_offered",
            "semester_Fall", "semester_Spring", "semester_Summer"
        ]
        return [float(vec[k]) for k in keys]
