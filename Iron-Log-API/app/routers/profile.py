import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..deps import get_db, get_current_user
from ..models import User
from ..schemas import UserOut, ProfileUpdate, OnboardingData

router = APIRouter(prefix="/profile", tags=["profile"])

@router.patch("/", response_model=UserOut)
def update_profile(
    body: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update profile fields."""
    if body.username is not None:
        if body.username != user.username:
            exists = db.query(User).filter(User.username == body.username).first()
            if exists:
                raise HTTPException(status.HTTP_409_CONFLICT, "Username taken")
        user.username = body.username
    if body.name is not None:
        if len(body.name.strip()) < 2:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "name too short")
        user.name = body.name.strip()
    if body.bio is not None:
        user.bio = body.bio
    if body.fitness_goal is not None:
        user.fitness_goal = body.fitness_goal
    if body.is_public is not None:
        user.is_public = body.is_public
    if body.units is not None:
        allowed = {"lbs", "kg"}
        if body.units not in allowed:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"units must be one of {allowed}")
        user.units = body.units

    db.commit()
    db.refresh(user)
    return user

@router.post("/onboarding", response_model=UserOut)
def complete_onboarding(
    body: OnboardingData,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Complete the mandatory body data onboarding."""
    if user.onboarding_completed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Onboarding already completed")

    # Update user data
    if body.gender:
        user.gender = body.gender
    if body.birth_date:
        user.birth_date = body.birth_date
    if body.height:
        user.height = body.height
    if body.experience_level:
        user.experience_level = body.experience_level
    
    user.onboarding_completed = True
    db.commit()
    
    # Save the initial metric
    if body.weight is not None or body.body_fat_pct is not None:
        from ..models import BodyMetric
        metric = BodyMetric(
            user_id=user.id,
            weight=body.weight,
            body_fat_pct=body.body_fat_pct,
            note="Initial onboarding"
        )
        db.add(metric)
        db.commit()

    db.refresh(user)
    return user

