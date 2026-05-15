from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import traceback

from .config import settings
from .routers import auth, exercises, workouts, metrics, records, analytics

_is_prod = settings.ENV == "production"

app = FastAPI(
    title="IronLog API",
    version="2.4.0",
    debug=True,
    # Disable interactive docs in production to avoid exposing the API surface
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    # Also allow all Cloudflare Workers/Pages origins (*.workers.dev, *.pages.dev)
    # so the Cloudflare frontend works regardless of how CORS_ORIGINS is configured.
    allow_origin_regex=r"https://.+\.workers\.dev|https://.+\.pages\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(exercises.router)
app.include_router(workouts.router)
app.include_router(metrics.router)
app.include_router(records.router)
app.include_router(analytics.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "env": settings.ENV, "version": "v3-ironlog"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "traceback": traceback.format_exc()}
    )
