from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Anchor to backend/.env by absolute path (this file lives at backend/app/core/config.py)
# rather than a bare ".env", which pydantic-settings would resolve relative to whatever
# directory the process happens to be launched from (uvicorn, alembic, an IDE run
# config, etc). Without this, running from the wrong cwd silently falls back to the
# class defaults below instead of raising -- which is exactly what happened when the
# app connected to Postgres as the default "tj_user" instead of the configured user.
BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    # Postgres
    postgres_user: str = "tj_user"
    postgres_password: str = "tj_password"
    postgres_db: str = "trading_journal"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    # Auth
    secret_key: str = "change-me-to-a-random-64-char-hex-string"
    app_username: str = "mike"
    app_password_hash: str = ""
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week

    # Misc
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
