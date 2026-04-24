from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class Course(Base):
    __tablename__ = 'courses'
    code = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    prefix = Column(String, nullable=False)
    number = Column(String, nullable=False)
    type = Column(String, nullable=False)
    study_plan = Column(String, nullable=True)
    prerequisites = Column(Text, nullable=True)  # JSON serialized list of strings
    is_math = Column(Boolean, default=False)
    is_core = Column(Boolean, default=False)
    course_level = Column(Integer, default=1)

class CourseOffering(Base):
    __tablename__ = 'course_offerings'
    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, index=True, nullable=False)
    semester = Column(String, index=True, nullable=False)
    campus = Column(String, index=True, nullable=False)
    course_code = Column(String, nullable=False)
    total_enrolled = Column(Integer, nullable=False, default=0)
    passed_count = Column(Integer, nullable=False, default=0)
    failed_count = Column(Integer, nullable=False, default=0)
    fail_ratio = Column(Float, nullable=False, default=0.0)
    is_offered = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DataAuditLog(Base):
    __tablename__ = 'data_audit_logs'
    id = Column(Integer, primary_key=True, index=True)
    table_affected = Column(String, nullable=False)
    action = Column(String, nullable=False)  # "UPLOAD", "EDIT", "DELETE"
    description = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class PredictionRun(Base):
    __tablename__ = 'prediction_runs'
    id = Column(Integer, primary_key=True, index=True)
    run_name = Column(String, nullable=False)
    campus = Column(String, nullable=True) # Added for filtering past runs
    target_year = Column(Integer, nullable=False)
    target_semester = Column(String, nullable=False)
    model_version = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    entries = relationship('PredictionEntry', back_populates='run', cascade="all, delete-orphan")

class PredictionEntry(Base):
    __tablename__ = 'prediction_entries'
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey('prediction_runs.id'), nullable=False)
    course_code = Column(String, nullable=False)
    campus = Column(String, nullable=False)
    
    # Computed Demand / Constraints
    latent_demand = Column(Integer, default=0)
    bottleneck_score = Column(Integer, default=0)
    
    offer_score = Column(Float, nullable=False)  # e.g., 0-100% Probability of 1
    confidence = Column(Float, nullable=False)   # Model confidence
    offer = Column(Boolean, nullable=False)
    
    # Section Planner outputs
    projected_sections = Column(Integer, default=0)
    is_tech_elective_pool = Column(Boolean, default=False)

    run = relationship('PredictionRun', back_populates='entries')

class Doctor(Base):
    __tablename__ = 'doctors'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    allowed_courses = Column(Text, nullable=True) # JSON list
    
    availability = relationship('DoctorAvailability', back_populates='doctor', cascade="all, delete-orphan")

class DoctorAvailability(Base):
    __tablename__ = 'doctor_availability'
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey('doctors.id'), nullable=False)
    days = Column(String, nullable=False)  # e.g., "M", "WF"
    start = Column(String, nullable=False) # e.g., "08:00"
    end = Column(String, nullable=False)   # e.g., "10:00"
    
    doctor = relationship('Doctor', back_populates='availability')

class ScheduleEntry(Base):
    __tablename__ = 'schedule_entries'
    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String, nullable=False)
    section_name = Column(String, nullable=False)  # "A", "Elective 1"
    doctor_id = Column(Integer, ForeignKey('doctors.id'), nullable=True)
    day = Column(String, nullable=False)  # "MWF", "TTH" or specific
    start_time = Column(String, nullable=False)  # "08:00"
    duration_mins = Column(Integer, nullable=False, default=50)
    room = Column(String, nullable=True)
    
    doctor = relationship('Doctor')

class TrainingRecord(Base):
    __tablename__ = 'training_records'
    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    semester = Column(String, nullable=False)
    campus = Column(String, nullable=False)
    course_code = Column(String, nullable=False)
    course_prefix = Column(String, nullable=True)
    is_core = Column(Integer, default=0)
    is_math = Column(Integer, default=0)
    avg_fail_ratio_3y = Column(Float, default=0.0)
    recent_fail_count = Column(Integer, default=0)
    is_offered_last_year = Column(Integer, default=0)
    latent_demand_count = Column(Integer, default=0)
    bottleneck_score = Column(Integer, default=0)
    plan_alignment_score = Column(Float, default=0.0)
    course_level = Column(Integer, default=1)
    gap_since_last_offered = Column(Integer, default=99)
    is_offered = Column(Integer, nullable=False) # 1 or 0
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    email = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
