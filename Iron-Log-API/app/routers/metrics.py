from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..deps import get_db, get_current_user
from ..models import BodyMetric, User
from ..schemas import BodyMetricIn, BodyMetricOut

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("", response_model=list[BodyMetricOut])
def list_metrics(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (db.query(BodyMetric)
              .filter(BodyMetric.user_id == user.id)
              .order_by(BodyMetric.measured_at.desc()).all())


@router.post("", response_model=BodyMetricOut)
def create_metric(body: BodyMetricIn, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    m = BodyMetric(user_id=user.id, **body.model_dump())
    db.add(m); db.commit(); db.refresh(m)
    return m
