from datetime import date as date_type
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Table, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

journal_tags = Table(
    "journal_tags",
    Base.metadata,
    Column("journal_id", ForeignKey("journals.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Journal(Base):
    __tablename__ = "journals"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    tags = relationship("Tag", secondary=journal_tags, back_populates="journals")
    orders = relationship("OrderItem", back_populates="journal", cascade="all, delete-orphan")
    images = relationship("JournalImage", back_populates="journal", cascade="all, delete-orphan")
