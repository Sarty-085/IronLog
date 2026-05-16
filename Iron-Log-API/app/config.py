from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg://localhost/ironlog"
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MIN: int = 10080  # 7 days — prevents hourly re-login in production
    CORS_ORIGINS: str = "http://localhost:5173"
    ENV: str = "development"  # set to "production" in Railway to disable Swagger

    # Resend
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "IronLog <noreply@ironlog.app>"


settings = Settings()
