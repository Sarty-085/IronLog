from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# Auth
class SignupIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    units: str

    class Config:
        from_attributes = True


# Exercises
class ExerciseIn(BaseModel):
    name: str
    muscle_group: str


class ExerciseOut(ExerciseIn):
    id: str
    is_global: bool

    class Config:
        from_attributes = True


# Workouts & sets
class SetIn(BaseModel):
    exercise_id: str
    weight: float = 0
    reps: int = 0
    rpe: float | None = None
    is_done: bool = False


class SetOut(SetIn):
    id: str
    set_index: int
    is_pr: bool

    class Config:
        from_attributes = True


class WorkoutIn(BaseModel):
    name: str = "New Workout"
    notes: str | None = None


class WorkoutPatch(BaseModel):
    name: str | None = None
    notes: str | None = None
    ended_at: datetime | None = None


class WorkoutOut(BaseModel):
    id: str
    name: str
    started_at: datetime
    ended_at: datetime | None
    notes: str | None
    sets: list[SetOut] = []

    class Config:
        from_attributes = True


# Metrics
class BodyMetricIn(BaseModel):
    weight: float | None = None
    body_fat_pct: float | None = None
    note: str | None = None


class BodyMetricOut(BodyMetricIn):
    id: str
    measured_at: datetime

    class Config:
        from_attributes = True
