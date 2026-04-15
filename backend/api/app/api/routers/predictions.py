from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import List
import json

from app.db.database import get_db
from app.db import models
from app.services.ml_pipeline import MLPipeline
from app.services.section_planner import SectionPlanner
from app.schemas import domain

router = APIRouter()

class SlotConfig(BaseModel):
    csc_core: int = 12
    csc_elective: int = 3
    bif_core: int = 6
    bif_elective: int = 2
    mth: int = 8
    sta: int = 3

class BulkPredictRequest(BaseModel):
    run_name: str
    target_year: int
    target_semester: str
    target_campus: str
    new_enrollees: int = 0
    slots: SlotConfig = SlotConfig()

@router.get("/next-term")
def get_next_term(db: Session = Depends(get_db)):
    """
    Auto-detect the next term to predict based on the latest available offering.
    E.g. if data ends at Spring 2025, returns {year: 2025, semester: 'Fall'}.
    """
    latest = db.query(models.CourseOffering).order_by(
        models.CourseOffering.year.desc()
    ).first()
    if not latest:
        raise HTTPException(status_code=400, detail="No offerings data found.")

    sem_next = {"Spring": "Fall", "Fall": "Spring"}
    year_bump = {"Spring": 0, "Fall": 1}
    # If last data somehow had Summer (shouldn't happen), land on Fall
    if latest.semester not in sem_next:
        return {"year": latest.year, "semester": "Fall"}
    next_sem = sem_next[latest.semester]
    next_year = latest.year + year_bump[latest.semester]
    return {"year": next_year, "semester": next_sem}

@router.post("/train")
def train_model(db: Session = Depends(get_db)):
    pipeline = MLPipeline(db)
    try:
        result = pipeline.train_and_save()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/initialize")
def initialize_dataset(db: Session = Depends(get_db)):
    pipeline = MLPipeline(db)
    try:
        result = pipeline.prepare_training_dataset()
        if result.get("status") == "error":
            raise HTTPException(status_code=400, detail=result.get("message"))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk", response_model=domain.PredictionRunResponse)
def generate_bulk_predictions(req: BulkPredictRequest, db: Session = Depends(get_db)):
    pipeline = MLPipeline(db)
    planner = SectionPlanner(db)
    
    # 1. Fetch available catalog courses
    all_courses = db.query(models.Course).all()
    if not all_courses:
        raise HTTPException(status_code=400, detail="No courses in catalog")

    # 2. Extract features
    raw_predictions = []
    
    for c in all_courses:
        try:
            feats = pipeline.ft.predict_payload(
                c.code, req.target_year, req.target_semester, req.target_campus
            )
            # Need actual un-arrayed vector for DB logic
            vec = pipeline.ft.build_feature_vector(
                c.code, req.target_year, req.target_semester, req.target_campus
            )

            # For courses with no prerequisites (first-year), use new_enrollees
            # as their latent demand if it's provided.
            # Prerequisites are stored as a JSON string e.g. "[]" or '["CSC243"]'
            effective_latent = vec["latent_demand_count"]
            if effective_latent == 0 and req.new_enrollees > 0:
                try:
                    prereqs = json.loads(c.prerequisites) if c.prerequisites else []
                except Exception:
                    prereqs = []
                if len(prereqs) == 0:
                    effective_latent = req.new_enrollees

            preds, probas = pipeline.predict([feats])
            confidence = float(probas[0].max())
            offer_score = float(probas[0][1]) * 100  # Prob of class 1

            # Apply level multiplier to the recursive dependency yield
            # (Higher level courses are closer to graduation and thus more critical)
            yield_val = vec["bottleneck_score"]
            if c.course_level and c.course_level >= 400:
                yield_val = int(yield_val * 1.5)

            raw_predictions.append({
                "course_code": c.code,
                "prefix": c.prefix.upper(),
                "course_type": (c.type or "").lower(),
                "latent_demand": effective_latent,
                "bottleneck_score": yield_val,
                "offer_score": offer_score,
                "confidence": confidence,
                "offer": False  # determined below by slot selection
            })
        except FileNotFoundError as e:
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            print(f"Failed extracting features for {c.code}: {e}")
            continue

    # 3. Slot-based selection: pick top-K courses per slot
    SLOTS = [
        {"prefix": "CSC", "type": "core",     "count": req.slots.csc_core},
        {"prefix": "CSC", "type": "elective", "count": req.slots.csc_elective},
        {"prefix": "BIF", "type": "core",     "count": req.slots.bif_core},
        {"prefix": "BIF", "type": "elective", "count": req.slots.bif_elective},
        {"prefix": "MTH", "type": None,       "count": req.slots.mth},
        {"prefix": "STA", "type": None,       "count": req.slots.sta},
    ]
    selected_codes: set = set()
    for slot in SLOTS:
        candidates = sorted(
            [
                p for p in raw_predictions
                if p["prefix"] == slot["prefix"]
                and (slot["type"] is None or p["course_type"] == slot["type"])
                and p["course_code"] not in selected_codes
            ],
            key=lambda x: x["offer_score"],
            reverse=True
        )
        for p in candidates[:slot["count"]]:
            p["offer"] = True
            selected_codes.add(p["course_code"])

    # 3. Calculate Sections
    planned_entries = planner.plan_predictions(raw_predictions)

    # 4. Save to DB
    run = models.PredictionRun(
        run_name=req.run_name,
        target_year=req.target_year,
        target_semester=req.target_semester,
        model_version="backend_model_v1"
    )
    db.add(run)
    db.flush()

    for p in planned_entries:
        entry = models.PredictionEntry(
            run_id=run.id,
            campus=req.target_campus,
            course_code=p["course_code"],
            latent_demand=p["latent_demand"],
            bottleneck_score=p["bottleneck_score"],
            offer_score=p["offer_score"],
            confidence=p["confidence"],
            offer=p["offer"],
            projected_sections=p["projected_sections"],
            is_tech_elective_pool=p["is_tech_elective_pool"]
        )
        db.add(entry)
    
    db.commit()
    db.refresh(run)
    return run

@router.get("/runs", response_model=List[domain.PredictionRunResponse])
def get_prediction_runs(db: Session = Depends(get_db)):
    return db.query(models.PredictionRun).order_by(models.PredictionRun.created_at.desc()).all()
