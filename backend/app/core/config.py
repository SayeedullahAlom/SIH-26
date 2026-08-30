"""
Application configuration.

All secrets and environment-specific values are read from environment
variables (optionally via a local .env file during development). Nothing
sensitive is hardcoded here.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Database ---
    DATABASE_URL: str

    # --- JWT / auth ---
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # --- Reserved for later phases (AI/OCR/RAG) ---
    # Present now only so the env format is settled; not used in Phase 1.
    AI_API_KEY: str | None = None

    # --- App metadata ---
    APP_NAME: str = "Legal Metrology Compliance API"
    APP_VERSION: str = "0.1.0"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
