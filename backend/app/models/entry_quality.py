from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EntryQualityFactor(Base):
    """
    A factor the user has added to their EntryQualityCalculator, referencing
    a preset by key (see app/core/factor_presets.py for the scoring logic
    and metadata -- name/description/input_type are resolved from the
    preset registry at read time, not stored here).
    """

    __tablename__ = "entry_quality_factors"
    __table_args__ = (UniqueConstraint("user_id", "preset_key", name="uq_entry_quality_factor_user_preset"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    preset_key: Mapped[str] = mapped_column(String(100), nullable=False)
    weight: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    sort_order: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
