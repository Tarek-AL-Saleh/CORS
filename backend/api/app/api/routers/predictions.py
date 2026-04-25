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
from app.services.ml_feature_transformer import FeatureTransformer
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
    new_freshman: int = 0
    new_sophomores: int = 0
    new_masters: int = 0
    use_quotas: bool = False
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
                c.code, req.target_year, req.target_semester, req.target_campus, req.new_freshman, req.new_sophomores, req.new_masters
            )
            vec = pipeline.ft.build_feature_vector(
                c.code, req.target_year, req.target_semester, req.target_campus, req.new_freshman, req.new_sophomores, req.new_masters
            )

            effective_latent = vec["latent_demand_count"]
            if effective_latent == 0:
                # Fallback: if no historical prereq data, use appropriate influx
                course_types_raw = c.type or "elective"
                import json as _j
                try:
                    ctypes = _j.loads(course_types_raw) if course_types_raw.startswith('[') else [course_types_raw]
                except:
                    ctypes = [course_types_raw]
                
                # Sophomore gateway check
                is_gateway = c.code in FeatureTransformer.SOPHOMORE_GATEWAY_CODES or \
                             any(part in FeatureTransformer.SOPHOMORE_GATEWAY_CODES for part in c.code.split("/"))

                if any(t in ["masters", "minor"] for t in ctypes):
                    effective_latent = req.new_masters
                elif is_gateway:
                    effective_latent = req.new_sophomores
                else:
                    # Default for courses with no historical demand and no prereqs is freshman
                    effective_latent = req.new_freshman

            # predict now returns (preds, probas) taking the campus argument
            preds, probas = pipeline.predict([feats], req.target_campus)
            
            # The exact F1.5-Score Threshold classification from the model (1 or 0)
            is_recommended_by_ml = bool(preds[0])

            # BOTH must use probas[0][1] = probability of class 1 (being offered)
            # Using .max() was wrong: for non-recommended courses, .max() returns
            # class 0's probability, making confidence = 1 - offer_score
            prob_offered = float(probas[0][1])
            offer_score = prob_offered * 100
            confidence = prob_offered

            yield_val = vec["bottleneck_score"]
            if c.course_level and c.course_level >= 400:
                yield_val = int(yield_val * 1.5)

            # Parse course type - may be a JSON array for cross-listed courses
            try:
                raw_type = c.type or "elective"
                import json as _json
                course_types = _json.loads(raw_type) if raw_type.startswith('[') else [raw_type]
                course_types = [t.lower() for t in course_types]
            except:
                course_types = [(c.type or "elective").lower()]

            raw_predictions.append({
                "course_code": c.code,
                "prefix": c.prefix.upper(),
                "course_types": course_types,  # List of types
                "course_type": course_types[0] if course_types else "elective",  # Compat
                "latent_demand": effective_latent,
                "bottleneck_score": yield_val,
                "offer_score": offer_score,
                "confidence": confidence,
                # Recommended if it passes threshold AND we aren't using the Quota system
                "offer": is_recommended_by_ml if not req.use_quotas else False
            })
        except FileNotFoundError as e:
            raise HTTPException(status_code=500, detail=str(e))
        except Exception as e:
            print(f"Failed extracting features for {c.code}: {e}")
            continue

    # 3. Slot-based selection (OPTIONAL)
    if req.use_quotas:
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
                    if slot["prefix"] in p["prefix"].split("/")
                    and (slot["type"] is None or slot["type"] in p["course_types"])
                    and all(t not in ["masters", "minor"] for t in p["course_types"])  # Exclude grad/minor from UG slots
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
        campus=req.target_campus, # Explicitly save campus now
        target_year=req.target_year,
        target_semester=req.target_semester,
        model_version="backend_model_v2" # Transition to dual-model versioning
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
def get_prediction_runs(campus: str = None, db: Session = Depends(get_db)):
    query = db.query(models.PredictionRun)
    if campus:
        query = query.filter(models.PredictionRun.campus == campus)
    return query.order_by(models.PredictionRun.created_at.desc()).all()
