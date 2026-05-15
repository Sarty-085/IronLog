-- IronLog initial schema (Neon Postgres)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  name          varchar(120) NOT NULL,
  units         varchar(8)  NOT NULL DEFAULT 'lbs',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercises (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  name          varchar(120) NOT NULL,
  muscle_group  varchar(40)  NOT NULL,
  is_global     boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_exercises_group ON exercises(muscle_group);

CREATE TABLE IF NOT EXISTS workouts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        varchar(120) NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz,
  notes       text
);
CREATE INDEX IF NOT EXISTS idx_workouts_user_started ON workouts(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS workout_sets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id  uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  set_index   int  NOT NULL DEFAULT 1,
  weight      double precision NOT NULL DEFAULT 0,
  reps        int  NOT NULL DEFAULT 0,
  rpe         double precision,
  is_done     boolean NOT NULL DEFAULT false,
  is_pr       boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_sets_workout ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_sets_exercise ON workout_sets(exercise_id);

CREATE TABLE IF NOT EXISTS body_metrics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measured_at  timestamptz NOT NULL DEFAULT now(),
  weight       double precision,
  body_fat_pct double precision,
  note         text
);
CREATE INDEX IF NOT EXISTS idx_metrics_user_time ON body_metrics(user_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS personal_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id  uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  one_rm       double precision NOT NULL,
  max_volume   double precision NOT NULL,
  achieved_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pr_user_ex ON personal_records(user_id, exercise_id);
