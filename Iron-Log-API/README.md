# IronLog Backend Starter — FastAPI + SQLAlchemy + Neon Postgres + JWT

This is an **exportable starter** mirroring the IronLog frontend's data model.
Drop it into a separate repo, point `DATABASE_URL` at your Neon Postgres
project, and you have a production-shaped REST API ready for the React Native
Expo client.

> The current Lovable preview runs the frontend as a TanStack Start web PWA
> using local persistence (Zustand). This folder is **not executed** by the
> web preview — it's the spec/code you'd lift into your own backend repo.

## Layout

```
backend-starter/
├── app/
│   ├── main.py            # FastAPI app + router wiring + CORS
│   ├── config.py          # Settings (env-driven)
│   ├── db.py              # SQLAlchemy engine + session
│   ├── deps.py            # get_db, get_current_user
│   ├── security.py        # password hashing + JWT
│   ├── models.py          # SQLAlchemy ORM models
│   ├── schemas.py         # Pydantic request/response schemas
│   └── routers/
│       ├── auth.py        # /auth/signup, /auth/login, /auth/me
│       ├── exercises.py   # /exercises
│       ├── workouts.py    # /workouts (+ nested sets)
│       ├── metrics.py     # /metrics (body weight, etc.)
│       ├── records.py     # /records (PRs)
│       └── analytics.py   # /analytics/{volume,frequency,prs}
├── migrations/
│   └── 0001_init.sql      # Neon-ready Postgres schema
├── requirements.txt
└── .env.example
```

## Quick start

```bash
cd backend-starter
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # fill DATABASE_URL + JWT_SECRET
psql "$DATABASE_URL" -f migrations/0001_init.sql
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs for the interactive Swagger UI.

## REST surface

| Method | Path                              | Auth | Description                       |
|-------:|-----------------------------------|:----:|-----------------------------------|
| POST   | `/auth/signup`                    |  ✗   | Create user, return JWT           |
| POST   | `/auth/login`                     |  ✗   | Email + password → JWT            |
| GET    | `/auth/me`                        |  ✓   | Current user                      |
| GET    | `/exercises`                      |  ✓   | List exercises (filter by group)  |
| POST   | `/exercises`                      |  ✓   | Create custom exercise            |
| GET    | `/workouts`                       |  ✓   | List workouts (paginated)         |
| POST   | `/workouts`                       |  ✓   | Start a new workout               |
| GET    | `/workouts/{id}`                  |  ✓   | Workout detail (+ sets)           |
| PATCH  | `/workouts/{id}`                  |  ✓   | Finish / rename                   |
| DELETE | `/workouts/{id}`                  |  ✓   | Delete                            |
| POST   | `/workouts/{id}/sets`             |  ✓   | Add a set                         |
| PATCH  | `/sets/{set_id}`                  |  ✓   | Update weight/reps/done           |
| DELETE | `/sets/{set_id}`                  |  ✓   | Delete a set                      |
| GET    | `/metrics`                        |  ✓   | Body metrics history              |
| POST   | `/metrics`                        |  ✓   | Log body weight / measurement     |
| GET    | `/records`                        |  ✓   | Personal records                  |
| GET    | `/analytics/volume?days=30`       |  ✓   | Daily volume series               |
| GET    | `/analytics/frequency?weeks=10`   |  ✓   | Weekly frequency heatmap data     |
