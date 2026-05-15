from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..deps import get_db, get_current_user
from ..models import PersonalRecord, User

router = APIRouter(prefix="/records", tags=["records"])


@router.get("")
def list_records(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (db.query(PersonalRecord)
              .filter(PersonalRecord.user_id == user.id)
              .order_by(PersonalRecord.achieved_at.desc()).all())
    return [
        {
            "id": r.id,
            "exercise_id": r.exercise_id,
            "one_rm": r.one_rm,
            "max_volume": r.max_volume,
            "achieved_at": r.achieved_at,
        }
        for r in rows
    ]
