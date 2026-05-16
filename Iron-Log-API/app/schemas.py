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
    username: str | None = None
    avatar_url: str | None = None
    banner_url: str | None = None
    bio: str | None = None
    fitness_goal: str | None = None
    is_public: bool
    gender: str | None = None
    birth_date: datetime | None = None
    height: float | None = None
    experience_level: str | None = None
    onboarding_completed: bool
    units: str

    class Config:
        from_attributes = True

class ForgotPasswordIn(BaseModel):
    email: EmailStr

class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=128)

class ProfileUpdate(BaseModel):
    username: str | None = None
    name: str | None = None
    bio: str | None = None
    fitness_goal: str | None = None
    is_public: bool | None = None
    units: str | None = None

class OnboardingData(BaseModel):
    gender: str | None = None
    birth_date: datetime | None = None
    height: float | None = None
    experience_level: str | None = None
    weight: float | None = None
    body_fat_pct: float | None = None

class UploadUrlOut(BaseModel):
    upload_url: str
    public_url: str


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
