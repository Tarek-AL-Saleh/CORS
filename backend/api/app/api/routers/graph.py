import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import models

router = APIRouter()

@router.get("/")
def get_graph_data(db: Session = Depends(get_db)):
    courses = db.query(models.Course).all()
    
    # Try fetching the latest prediction run for bottleneck highlighting
    latest_run = db.query(models.PredictionRun).order_by(models.PredictionRun.created_at.desc()).first()
    bottlenecks = {}
    
    if latest_run:
        b_entries = db.query(models.PredictionEntry).filter(
            models.PredictionEntry.run_id == latest_run.id
        ).all()
        for b in b_entries:
            bottlenecks[b.course_code] = {"bottleneck_score": b.bottleneck_score, "latent_demand": b.latent_demand}
            
    nodes = []
    edges = []
    
    for c in courses:
        b_info = bottlenecks.get(c.code, {"bottleneck_score": 0, "latent_demand": 0})
        nodes.append({
            "id": c.code,
            "data": {
                "label": f"{c.code}\n{c.name}",
                "course_code": c.code,
                "name": c.name,
                "type": c.type,
                "bottleneck_score": b_info["bottleneck_score"],
                "latent_demand": b_info["latent_demand"]
            }
        })
        
        try:
            prereqs = json.loads(c.prerequisites) if c.prerequisites else []
            for p in prereqs:
                edges.append({
                    "id": f"edge-{p}-{c.code}",
                    "source": p,
                    "target": c.code
                })
        except:
            pass

    return {"nodes": nodes, "edges": edges}
