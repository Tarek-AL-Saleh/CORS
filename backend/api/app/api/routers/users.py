from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.db.database import get_db
from app.db import models
from app.core import security
from app.api.routers.auth import get_current_user, get_current_admin
from app.crud.crud_data import create_audit_log, create_action_log

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    email: str
    is_admin: bool = False

class UserUpdate(BaseModel):
    email: str
    is_admin: bool

class UserUpdateMe(BaseModel):
    username: str
    email: str
    current_password: str
    new_password: str | None = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@router.post("/", response_model=UserResponse)
def create_user(req: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    new_user = models.User(
        username=req.username,
        email=req.email,
        password_hash=security.get_password_hash("password"),
        is_admin=req.is_admin,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log Action
    create_action_log(db, "Emergency_Bypass", "USER_MGMT", f"Created user {new_user.username} (Admin: {req.is_admin})")
    
    return new_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, req: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.email = req.email
    user.is_admin = req.is_admin
    db.commit()
    db.refresh(user)
    
    create_action_log(db, "Emergency_Bypass", "USER_MGMT", f"Updated user {user.username} details.")
    return user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    db.delete(user)
    db.commit()
    
    create_action_log(db, "Emergency_Bypass", "USER_MGMT", f"Deleted user {user.username}.")
    return {"status": "success"}

@router.put("/me/update")
def update_me(req: UserUpdateMe, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not security.verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect current password")
        
    # Check if username is taken by someone else
    if req.username != current_user.username:
        existing = db.query(models.User).filter(models.User.username == req.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
    
    current_user.username = req.username
    current_user.email = req.email
    if req.new_password:
        current_user.password_hash = security.get_password_hash(req.new_password)
        
    db.commit()
    
    create_action_log(db, current_user.username, "PROFILE", "Updated personal profile information.")
    return {"status": "success"}
