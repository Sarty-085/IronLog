from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..deps import get_db, get_current_user
from ..models import Exercise, User
from ..schemas import ExerciseIn, ExerciseOut

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseOut])
def list_exercises(group: str | None = None, db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    q = db.query(Exercise).filter((Exercise.is_global == True) | (Exercise.user_id == user.id))  # noqa: E712
    if group:
        q = q.filter(Exercise.muscle_group == group)
    return q.order_by(Exercise.name).all()


@router.post("", response_model=ExerciseOut)
def create_exercise(body: ExerciseIn, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    ex = Exercise(user_id=user.id, name=body.name, muscle_group=body.muscle_group, is_global=False)
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex
