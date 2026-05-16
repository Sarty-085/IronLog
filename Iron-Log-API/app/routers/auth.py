from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..deps import get_db, get_current_user
from ..models import User, PasswordResetToken
from ..schemas import SignupIn, LoginIn, TokenOut, UserOut, ForgotPasswordIn, ResetPasswordIn
from ..security import hash_password, verify_password, create_access_token
from ..email_service import send_password_reset_email
import secrets
import hashlib
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/auth", tags=["auth"])

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

@router.post("/signup", response_model=TokenOut)
def signup(body: SignupIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    user = User(email=body.email, name=body.name, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_access_token(user.id))

@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return TokenOut(access_token=create_access_token(user.id))

@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user

@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        return {"detail": "If that email exists, a reset link has been sent."}
    
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    
    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(token),
        expires_at=expires
    )
    db.add(reset_token)
    db.commit()
    
    reset_link = f"http://localhost:5173/reset-password?token={token}"
    send_password_reset_email(user.email, reset_link)
    
    return {"detail": "If that email exists, a reset link has been sent."}

@router.post("/reset-password")
def reset_password(body: ResetPasswordIn, db: Session = Depends(get_db)):
    token_hash = _hash_token(body.token)
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at == None,
        PasswordResetToken.expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not reset_token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired token")
        
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User not found")
        
    user.password_hash = hash_password(body.new_password)
    reset_token.used_at = datetime.now(timezone.utc)
    
    db.commit()
    return {"detail": "Password successfully reset"}
