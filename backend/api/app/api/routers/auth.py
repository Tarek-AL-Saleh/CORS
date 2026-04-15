from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta
import random

from app.db.database import get_db
from app.db import models
from app.core import security

router = APIRouter()

# In-memory store for 2FA codes during development mock
two_step_codes = {}

class LoginRequest(BaseModel):
    username: str
    password: str

class Verify2FARequest(BaseModel):
    username: str
    code: str

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user or not security.verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    # Generate 6-digit code for 2-step verification
    code = f"{random.randint(100000, 999999)}"
    two_step_codes[request.username] = code
    
    # Mock sending email
    print(f"\n==================================================")
    print(f"MOCK EMAIL TO: {user.email}")
    print(f"SUBJECT: Your CORS Login Code")
    print(f"BODY: Your 2-step verification code is: {code}")
    print(f"==================================================\n")
    
    return {"message": "2FA code sent to email requires verification", "status": "2FA_REQUIRED"}

@router.post("/verify")
def verify_2fa(request: Verify2FARequest, response: Response, db: Session = Depends(get_db)):
    expected_code = two_step_codes.get(request.username)
    if not expected_code or expected_code != request.code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired verification code",
        )
    
    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Clear the code
    del two_step_codes[request.username]
    
    # Generate JWT
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # Set Cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=security.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": user.username
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}
