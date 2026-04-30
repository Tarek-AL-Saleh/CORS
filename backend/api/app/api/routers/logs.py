from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.db.database import get_db
from app.db import models
from app.api.routers.auth import get_current_admin

router = APIRouter()

class ActionLogResponse(BaseModel):
    id: int
    username: str
    action: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True

class DataAuditLogResponse(BaseModel):
    id: int
    table_affected: str
    action: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/actions", response_model=List[ActionLogResponse])
def get_action_logs(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    return db.query(models.ActionLog).order_by(models.ActionLog.created_at.desc()).limit(100).all()

@router.get("/data", response_model=List[DataAuditLogResponse])
def get_data_logs(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    return db.query(models.DataAuditLog).order_by(models.DataAuditLog.created_at.desc()).limit(100).all()
