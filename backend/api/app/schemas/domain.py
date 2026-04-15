from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class CourseBase(BaseModel):
    code: str
    name: str
    prefix: str
    number: str
    type: str
    study_plan: Optional[str] = None
    prerequisites: Optional[str] = None
    is_math: bool = False
    is_core: bool = False
    course_level: int = 1

class CourseResponse(CourseBase):
    class Config:
        from_attributes = True

class CourseOfferingBase(BaseModel):
    year: int
    semester: str
    campus: str
    course_code: str
    total_enrolled: int = 0
    passed_count: int = 0
    failed_count: int = 0
    fail_ratio: float = 0.0
    is_offered: bool = True

class CourseOfferingResponse(CourseOfferingBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class DoctorBase(BaseModel):
    name: str
    allowed_courses: Optional[str] = None
    available_days: Optional[str] = None
    available_times: Optional[str] = None

class DoctorResponse(DoctorBase):
    id: int
    class Config:
        from_attributes = True

class DoctorMinimal(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class PredictionEntryBase(BaseModel):
    course_code: str
    campus: str
    latent_demand: int = 0
    bottleneck_score: int = 0
    offer_score: float
    confidence: float
    offer: bool
    projected_sections: int = 0
    is_tech_elective_pool: bool = False

class PredictionEntryResponse(PredictionEntryBase):
    id: int
    run_id: int
    class Config:
        from_attributes = True

class PredictionRunResponse(BaseModel):
    id: int
    run_name: str
    target_year: int
    target_semester: str
    model_version: str
    created_at: datetime
    entries: List[PredictionEntryResponse] = []
    class Config:
        from_attributes = True
        protected_namespaces = ()

class TrainingRecordResponse(BaseModel):
    id: int
    year: int
    semester: str
    campus: str
    course_code: str
    is_offered: int
    latent_demand_count: int
    avg_fail_ratio_3y: float
    # Add other fields as needed for the UI table
    class Config:
        from_attributes = True
