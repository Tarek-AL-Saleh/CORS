from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.db import models

router = APIRouter()

@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    total_courses = db.query(models.Course).count()
    total_offerings = db.query(models.CourseOffering).count()
    
    avg_fail = db.query(func.avg(models.CourseOffering.fail_ratio)).scalar() or 0.0
    
    latest_run = db.query(models.PredictionRun).order_by(models.PredictionRun.created_at.desc()).first()
    
    total_predictions = 0
    total_offered_predictions = 0
    avg_confidence = 0.0

    if latest_run:
        total_predictions = db.query(models.PredictionEntry).filter(
            models.PredictionEntry.run_id == latest_run.id
        ).count()
        total_offered_predictions = db.query(models.PredictionEntry).filter(
            models.PredictionEntry.run_id == latest_run.id,
            models.PredictionEntry.offer == True
        ).count()
        
        # Load the formal ROC-AUC metric for the evaluated campus model
        try:
            import os
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
            auc_file = os.path.join(base_dir, 'ai-engine', 'models', f'auc_{latest_run.campus.lower()}.txt')
            with open(auc_file, 'r') as f:
                avg_confidence = float(f.read().strip())
        except Exception:
            avg_confidence = 0.0

    return {
        "total_courses": total_courses,
        "total_offerings": total_offerings,
        "average_fail_ratio": avg_fail * 100,  # Percentage format
        "latest_run_id": latest_run.id if latest_run else None,
        "total_predictions": total_predictions,
        "total_recommended_offerings": total_offered_predictions,
        "average_model_confidence": avg_confidence * 100
    }
