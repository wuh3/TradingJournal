from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Postgres
    postgres_user: str = "tj_user"
    postgres_password: str = "tj_password"
    postgres_db: str = "trading_journal"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    # Auth
    secret_key: str = "4ba61ace2f9afb8bfc4894984023d1ab7ece204cc3d5b6f126fc1e754b74674d"
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
