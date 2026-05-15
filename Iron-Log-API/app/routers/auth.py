from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..deps import get_db, get_current_user
from ..models import User
from ..schemas import SignupIn, LoginIn, TokenOut, UserOut
from ..security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class UserPatch(BaseModel):
    units: str | None = None
    name: str | None = None


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


@router.patch("/me", response_model=UserOut)
def patch_me(
    body: UserPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update profile fields (units preference, display name)."""
    if body.units is not None:
        allowed = {"lbs", "kg"}
        if body.units not in allowed:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"units must be one of {allowed}")
        user.units = body.units
    if body.name is not None:
        if len(body.name.strip()) < 2:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "name too short")
        user.name = body.name.strip()
    db.commit()
    db.refresh(user)
    return user
