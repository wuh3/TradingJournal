import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FactorType(str, enum.Enum):
    NUMBER = "number"
    BOOLEAN = "boolean"


class EntryQualityFactor(Base):
    """
    A user-defined factor for the EntryQualityCalculator (e.g. Risk/Reward
    ratio, RSI, "at key level?"). Number factors are normalized to a 0-1
    scale using min_value/max_value before their weight is applied, so they
    contribute to the weighted score on equal footing with boolean factors
    (which are just 0 or 1).
    """

    __tablename__ = "entry_quality_factors"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    factor_type: Mapped[FactorType] = mapped_column(Enum(FactorType, name="factor_type"), nullable=False)
    weight: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False, default=0)

    # Only used/required for NUMBER factors, to normalize raw values to 0-1.
    min_value: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    max_value: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)

    sort_order: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
