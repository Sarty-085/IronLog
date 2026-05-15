from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from ..deps import get_db, get_current_user
from ..models import Workout, WorkoutSet, Exercise, User

router = APIRouter(prefix="/analytics", tags=["analytics"])

LB_PER_KG = 2.2046226218


# ── helpers ────────────────────────────────────────────────────────────────

def _epley(weight: float, reps: int) -> float:
    """Epley estimated 1-rep-max."""
    if reps <= 0 or weight <= 0:
        return 0.0
    if reps == 1:
        return weight
    return weight * (1 + reps / 30)


# ── volume series ──────────────────────────────────────────────────────────

@router.get("/volume")
def volume_series(
    days: int = 30,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Daily total volume (weight × reps) over the last N days, for completed sets only."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(
            func.date_trunc("day", Workout.started_at).label("d"),
            func.coalesce(func.sum(WorkoutSet.weight * WorkoutSet.reps), 0).label("v"),
        )
        .join(WorkoutSet, WorkoutSet.workout_id == Workout.id, isouter=True)
        .filter(
            Workout.user_id == user.id,
            Workout.started_at >= since,
            WorkoutSet.is_done == True,  # noqa: E712
        )
        .group_by("d")
        .order_by("d")
        .all()
    )
    return [{"date": r.d.date().isoformat(), "volume": float(r.v)} for r in rows]


# ── frequency heatmap ──────────────────────────────────────────────────────

@router.get("/frequency")
def frequency(
    days: int = 70,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Workout count per day over the last N days (for heatmap)."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(
            func.date_trunc("day", Workout.started_at).label("d"),
            func.count(Workout.id).label("c"),
        )
        .filter(Workout.user_id == user.id, Workout.started_at >= since)
        .group_by("d")
        .order_by("d")
        .all()
    )
    return [{"date": r.d.date().isoformat(), "count": int(r.c)} for r in rows]


# ── streak ─────────────────────────────────────────────────────────────────

@router.get("/streak")
def streak(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Current consecutive-day workout streak (ends today or yesterday)."""
    # Fetch all distinct workout days, ordered newest first.
    rows = (
        db.query(func.date_trunc("day", Workout.started_at).label("d"))
        .filter(Workout.user_id == user.id)
        .group_by("d")
        .order_by(text("d DESC"))
        .all()
    )
    if not rows:
        return {"streak": 0}

    today = datetime.now(timezone.utc).date()
    # Collect distinct dates as a set for O(1) lookup
    days = {r.d.date() for r in rows}

    cursor = today
    # If no workout today, start from yesterday
    if cursor not in days:
        cursor = today - timedelta(days=1)

    count = 0
    while cursor in days:
        count += 1
        cursor -= timedelta(days=1)

    return {"streak": count}


# ── muscle group volume ────────────────────────────────────────────────────

@router.get("/muscle-volume")
def muscle_volume(
    days: int = 30,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Total completed-set volume per muscle group in the last N days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(
            Exercise.muscle_group.label("group"),
            func.coalesce(func.sum(WorkoutSet.weight * WorkoutSet.reps), 0).label("volume"),
        )
        .join(WorkoutSet, WorkoutSet.exercise_id == Exercise.id)
        .join(Workout, Workout.id == WorkoutSet.workout_id)
        .filter(
            Workout.user_id == user.id,
            Workout.started_at >= since,
            WorkoutSet.is_done == True,  # noqa: E712
        )
        .group_by(Exercise.muscle_group)
        .order_by(text("volume DESC"))
        .all()
    )
    return [{"group": r.group, "volume": float(r.volume)} for r in rows]


# ── personal records (1RM) ─────────────────────────────────────────────────

@router.get("/prs")
def personal_records(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Per-exercise best estimated 1RM (Epley) from all completed sets.
    Returns [{exercise_id, exercise_name, muscle_group, one_rm, best_weight, best_reps, achieved_at}].
    """
    # Pull every completed set with weight > 0 and reps > 0
    rows = (
        db.query(
            Exercise.id.label("exercise_id"),
            Exercise.name.label("exercise_name"),
            Exercise.muscle_group.label("muscle_group"),
            WorkoutSet.weight.label("weight"),
            WorkoutSet.reps.label("reps"),
            Workout.started_at.label("achieved_at"),
        )
        .join(WorkoutSet, WorkoutSet.exercise_id == Exercise.id)
        .join(Workout, Workout.id == WorkoutSet.workout_id)
        .filter(
            Workout.user_id == user.id,
            WorkoutSet.is_done == True,  # noqa: E712
            WorkoutSet.weight > 0,
            WorkoutSet.reps > 0,
        )
        .order_by(Workout.started_at.desc())
        .all()
    )

    # Compute Epley 1RM for each set, keep best per exercise
    best: dict[str, dict] = {}
    for r in rows:
        rm = _epley(float(r.weight), int(r.reps))
        ex_id = str(r.exercise_id)
        if ex_id not in best or rm > best[ex_id]["one_rm"]:
            best[ex_id] = {
                "exercise_id": ex_id,
                "exercise_name": r.exercise_name,
                "muscle_group": r.muscle_group,
                "one_rm": round(rm, 2),
                "best_weight": float(r.weight),
                "best_reps": int(r.reps),
                "achieved_at": r.achieved_at.isoformat(),
            }

    return sorted(best.values(), key=lambda x: x["one_rm"], reverse=True)


# ── progressive overload (per exercise over time) ──────────────────────────

@router.get("/progression/{exercise_id}")
def exercise_progression(
    exercise_id: str,
    days: int = 90,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Daily best weight for a specific exercise over the last N days,
    useful for progressive overload charts.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(
            func.date_trunc("day", Workout.started_at).label("d"),
            func.max(WorkoutSet.weight).label("max_weight"),
            func.max(WorkoutSet.reps).label("max_reps"),
        )
        .join(WorkoutSet, WorkoutSet.workout_id == Workout.id)
        .filter(
            Workout.user_id == user.id,
            WorkoutSet.exercise_id == exercise_id,
            WorkoutSet.is_done == True,  # noqa: E712
            Workout.started_at >= since,
        )
        .group_by("d")
        .order_by("d")
        .all()
    )
    return [
        {
            "date": r.d.date().isoformat(),
            "max_weight": float(r.max_weight),
            "estimated_1rm": round(_epley(float(r.max_weight), int(r.max_reps)), 2),
        }
        for r in rows
    ]


# ── summary card (dashboard) ───────────────────────────────────────────────

@router.get("/summary")
def summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    All-in-one summary for the dashboard card:
      - total_workouts
      - weekly_volume  (last 7 days)
      - monthly_volume (last 30 days)
      - prev_weekly_volume (7 days before last 7)
      - current_streak
    """
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    prev_week_start = now - timedelta(days=14)

    # total workouts
    total_workouts = (
        db.query(func.count(Workout.id))
        .filter(Workout.user_id == user.id)
        .scalar() or 0
    )

    def _vol(since: datetime, until: datetime | None = None) -> float:
        q = (
            db.query(func.coalesce(func.sum(WorkoutSet.weight * WorkoutSet.reps), 0))
            .join(Workout, Workout.id == WorkoutSet.workout_id)
            .filter(
                Workout.user_id == user.id,
                WorkoutSet.is_done == True,  # noqa: E712
                Workout.started_at >= since,
            )
        )
        if until:
            q = q.filter(Workout.started_at < until)
        return float(q.scalar() or 0)

    weekly_vol = _vol(week_start)
    monthly_vol = _vol(month_start)
    prev_weekly_vol = _vol(prev_week_start, week_start)

    if prev_weekly_vol > 0:
        pct_change = ((weekly_vol - prev_weekly_vol) / prev_weekly_vol) * 100
    else:
        pct_change = 100.0 if weekly_vol > 0 else 0.0

    # streak (reuse logic)
    day_rows = (
        db.query(func.date_trunc("day", Workout.started_at).label("d"))
        .filter(Workout.user_id == user.id)
        .group_by("d")
        .order_by(text("d DESC"))
        .all()
    )
    days_set = {r.d.date() for r in day_rows}
    cursor = now.date()
    if cursor not in days_set:
        cursor -= timedelta(days=1)
    streak_count = 0
    while cursor in days_set:
        streak_count += 1
        cursor -= timedelta(days=1)

    return {
        "total_workouts": int(total_workouts),
        "weekly_volume": weekly_vol,
        "monthly_volume": monthly_vol,
        "prev_weekly_volume": prev_weekly_vol,
        "weekly_pct_change": round(pct_change, 1),
        "current_streak": streak_count,
    }
