from fastapi import APIRouter, Depends, HTTPException, Response, status, Request
import jwt
from jwt import PyJWTError
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta
import random

from app.db.database import get_db
from app.db import models
from app.core import security
from app.crud.crud_data import create_action_log

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
    
    # Send actual email
    from app.services.email_service import send_2fa_code
    success = send_2fa_code(user.email, code)
    
    if not success:
        # Fallback for local development if SendGrid is not configured
        print(f"\n[DEV FALLBACK] EMAIL TO: {user.email} | CODE: {code}\n")
    
    return {"message": "Verification code sent to email", "status": "2FA_REQUIRED"}

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
    
    create_action_log(db, user.username, "LOGIN", "Successful 2-step authentication login.")
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": user.username,
        "is_admin": getattr(user, 'is_admin', False)
    }

def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = token.split(" ")[1]
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return current_user

@router.post("/logout")
def logout(response: Response, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    create_action_log(db, current_user.username, "LOGOUT", "User logged out of the session.")
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}

