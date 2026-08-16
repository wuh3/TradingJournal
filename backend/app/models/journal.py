from datetime import date as date_type
from datetime import datetime

from sqlalchemy import DateTime, Date, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Journal(Base):
    __tablename__ = "journals"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_journal_user_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Tags are no longer stored directly on the journal -- they're computed at
    # query time as the union of this journal's orders' tags (see
    # app/routers/journals.py). This keeps a single source of truth (the order)
    # and avoids the two ever going out of sync.
    orders = relationship("OrderItem", back_populates="journal", cascade="all, delete-orphan")
    images = relationship("JournalImage", back_populates="journal", cascade="all, delete-orphan")
