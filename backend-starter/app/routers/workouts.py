from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_db, get_current_user
from ..models import Workout, WorkoutSet, PersonalRecord, User
from ..schemas import WorkoutIn, WorkoutPatch, WorkoutOut, SetIn, SetOut

router = APIRouter(tags=["workouts"])


def _epley(weight: float, reps: int) -> float:
    if reps <= 0 or weight <= 0:
        return 0.0
    if reps == 1:
        return weight
    return weight * (1 + reps / 30)


def _upsert_pr(db: Session, user_id: str, exercise_id: str, weight: float, reps: int, achieved_at: datetime) -> bool:
    """
    Upsert the PersonalRecord for this user+exercise if the new 1RM is a PR.
    Returns True if this set is a new PR.
    """
    one_rm = _epley(weight, reps)
    if one_rm <= 0:
        return False

    vol = weight * reps
    existing = (
        db.query(PersonalRecord)
        .filter(PersonalRecord.user_id == user_id, PersonalRecord.exercise_id == exercise_id)
        .first()
    )

    if existing is None:
        db.add(
            PersonalRecord(
                user_id=user_id,
                exercise_id=exercise_id,
                one_rm=one_rm,
                max_volume=vol,
                achieved_at=achieved_at,
            )
        )
        db.flush()
        return True

    is_new_pr = False
    if one_rm > existing.one_rm:
        existing.one_rm = one_rm
        existing.achieved_at = achieved_at
        is_new_pr = True
    if vol > existing.max_volume:
        existing.max_volume = vol
        if not is_new_pr:
            existing.achieved_at = achieved_at
    return is_new_pr


@router.get("/workouts", response_model=list[WorkoutOut])
def list_workouts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = 100,
    offset: int = 0,
):
    return (
        db.query(Workout)
        .filter(Workout.user_id == user.id)
        .order_by(Workout.started_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.post("/workouts", response_model=WorkoutOut)
def create_workout(
    body: WorkoutIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    w = Workout(user_id=user.id, name=body.name, notes=body.notes)
    db.add(w)
    db.commit()
    db.refresh(w)
    return w


@router.get("/workouts/{wid}", response_model=WorkoutOut)
def get_workout(
    wid: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    w = db.get(Workout, wid)
    if not w or w.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    return w


@router.patch("/workouts/{wid}", response_model=WorkoutOut)
def patch_workout(
    wid: str,
    body: WorkoutPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    w = db.get(Workout, wid)
    if not w or w.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(w, k, v)
    db.commit()
    db.refresh(w)
    return w


@router.delete("/workouts/{wid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(
    wid: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    w = db.get(Workout, wid)
    if w and w.user_id == user.id:
        db.delete(w)
        db.commit()


@router.post("/workouts/{wid}/sets", response_model=SetOut)
def add_set(
    wid: str,
    body: SetIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    w = db.get(Workout, wid)
    if not w or w.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    next_index = (
        db.query(WorkoutSet)
        .filter(WorkoutSet.workout_id == wid, WorkoutSet.exercise_id == body.exercise_id)
        .count()
        + 1
    )

    is_pr = False
    if body.is_done and body.weight > 0 and body.reps > 0:
        achieved_at = w.started_at or datetime.now(timezone.utc)
        is_pr = _upsert_pr(db, user.id, body.exercise_id, body.weight, body.reps, achieved_at)

    s = WorkoutSet(workout_id=wid, set_index=next_index, is_pr=is_pr, **body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.patch("/sets/{set_id}", response_model=SetOut)
def patch_set(
    set_id: str,
    body: SetIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    s = db.get(WorkoutSet, set_id)
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    w = db.get(Workout, s.workout_id)
    if not w or w.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    # Update fields
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(s, k, v)

    # Check PR whenever a set is marked done
    if s.is_done and s.weight > 0 and s.reps > 0:
        achieved_at = w.started_at or datetime.now(timezone.utc)
        is_pr = _upsert_pr(db, user.id, s.exercise_id, s.weight, s.reps, achieved_at)
        s.is_pr = is_pr
    elif not s.is_done:
        # If toggled back to not-done, clear PR flag on this set
        s.is_pr = False

    db.commit()
    db.refresh(s)
    return s


@router.delete("/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set(
    set_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    s = db.get(WorkoutSet, set_id)
    if s:
        w = db.get(Workout, s.workout_id)
        if w and w.user_id == user.id:
            db.delete(s)
            db.commit()
