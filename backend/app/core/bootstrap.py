"""
Ensures the single application user exists in the DB, created from the
APP_USERNAME / APP_PASSWORD_HASH env vars on first startup.
"""

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import User

settings = get_settings()


def ensure_app_user(db: Session) -> None:
    existing = db.query(User).filter(User.username == settings.app_username).first()
    if existing is not None:
        return

    if not settings.app_password_hash:
        # No password configured yet -- skip silently, login will just fail
        # until APP_PASSWORD_HASH is set in .env (see scripts/hash_password.py).
        return

    user = User(username=settings.app_username, password_hash=settings.app_password_hash)
    db.add(user)
    db.commit()
