-- IronLog migration 0002: performance indices + global exercise seed
-- Run AFTER 0001_init.sql

-- Composite index for analytics queries (filtered to completed sets)
CREATE INDEX IF NOT EXISTS idx_sets_done ON workout_sets(workout_id, is_done)
  WHERE is_done = true;

-- Index for PR lookups
CREATE INDEX IF NOT EXISTS idx_sets_exercise_done ON workout_sets(exercise_id, is_done)
  WHERE is_done = true AND weight > 0 AND reps > 0;

-- Seed global exercises (idempotent via ON CONFLICT DO NOTHING)
-- id is deterministic using gen_random_uuid() seeded by name hash; we use fixed UUIDs.
INSERT INTO exercises (id, user_id, name, muscle_group, is_global) VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'Barbell Bench Press',    'Chest',     true),
  ('00000000-0000-0000-0000-000000000002', NULL, 'Incline Bench Press',    'Chest',     true),
  ('00000000-0000-0000-0000-000000000003', NULL, 'Dumbbell Fly',           'Chest',     true),
  ('00000000-0000-0000-0000-000000000004', NULL, 'Cable Fly',              'Chest',     true),
  ('00000000-0000-0000-0000-000000000005', NULL, 'Dumbbell Press',         'Chest',     true),
  ('00000000-0000-0000-0000-000000000006', NULL, 'Barbell Row',            'Back',      true),
  ('00000000-0000-0000-0000-000000000007', NULL, 'Pull-up',                'Back',      true),
  ('00000000-0000-0000-0000-000000000008', NULL, 'Lat Pulldown',           'Back',      true),
  ('00000000-0000-0000-0000-000000000009', NULL, 'Seated Cable Row',       'Back',      true),
  ('00000000-0000-0000-0000-000000000010', NULL, 'Deadlift',               'Back',      true),
  ('00000000-0000-0000-0000-000000000011', NULL, 'Assisted Pull-up',       'Back',      true),
  ('00000000-0000-0000-0000-000000000012', NULL, 'Barbell Squat',          'Legs',      true),
  ('00000000-0000-0000-0000-000000000013', NULL, 'Front Squat',            'Legs',      true),
  ('00000000-0000-0000-0000-000000000014', NULL, 'Leg Press',              'Legs',      true),
  ('00000000-0000-0000-0000-000000000015', NULL, 'Romanian Deadlift',      'Legs',      true),
  ('00000000-0000-0000-0000-000000000016', NULL, 'Hip Thrust',             'Legs',      true),
  ('00000000-0000-0000-0000-000000000017', NULL, 'Leg Curl',               'Legs',      true),
  ('00000000-0000-0000-0000-000000000018', NULL, 'Leg Extension',          'Legs',      true),
  ('00000000-0000-0000-0000-000000000019', NULL, 'Calf Raise',             'Legs',      true),
  ('00000000-0000-0000-0000-000000000020', NULL, 'Overhead Press',         'Shoulders', true),
  ('00000000-0000-0000-0000-000000000021', NULL, 'Arnold Press',           'Shoulders', true),
  ('00000000-0000-0000-0000-000000000022', NULL, 'Lateral Raise',          'Shoulders', true),
  ('00000000-0000-0000-0000-000000000023', NULL, 'Front Raise',            'Shoulders', true),
  ('00000000-0000-0000-0000-000000000024', NULL, 'Bicep Curl',             'Arms',      true),
  ('00000000-0000-0000-0000-000000000025', NULL, 'Hammer Curl',            'Arms',      true),
  ('00000000-0000-0000-0000-000000000026', NULL, 'Preacher Curl',          'Arms',      true),
  ('00000000-0000-0000-0000-000000000027', NULL, 'Tricep Pushdown',        'Arms',      true),
  ('00000000-0000-0000-0000-000000000028', NULL, 'Skull Crusher',          'Arms',      true),
  ('00000000-0000-0000-0000-000000000029', NULL, 'Overhead Tricep Extension', 'Arms',   true),
  ('00000000-0000-0000-0000-000000000030', NULL, 'Plank',                  'Core',      true),
  ('00000000-0000-0000-0000-000000000031', NULL, 'Ab Rollout',             'Core',      true),
  ('00000000-0000-0000-0000-000000000032', NULL, 'Crunch',                 'Core',      true),
  ('00000000-0000-0000-0000-000000000033', NULL, 'Russian Twist',          'Core',      true),
  ('00000000-0000-0000-0000-000000000034', NULL, 'Treadmill Run',          'Cardio',    true),
  ('00000000-0000-0000-0000-000000000035', NULL, 'Cycling',                'Cardio',    true),
  ('00000000-0000-0000-0000-000000000036', NULL, 'Jump Rope',              'Cardio',    true)
ON CONFLICT (id) DO NOTHING;
