import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class OrderDirection(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    FILLED = "filled"


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    journal_id: Mapped[int] = mapped_column(ForeignKey("journals.id", ondelete="CASCADE"), nullable=False)

    ticker: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    price: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    direction: Mapped[OrderDirection] = mapped_column(Enum(OrderDirection, name="order_direction"), nullable=False)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status"), nullable=False, default=OrderStatus.FILLED
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    journal = relationship("Journal", back_populates="orders")
    images = relationship("OrderImage", back_populates="order", cascade="all, delete-orphan")

    # Links where this order is the closing/reducing side
    links_from = relationship(
        "OrderLink",
        foreign_keys="OrderLink.from_order_id",
        back_populates="from_order",
        cascade="all, delete-orphan",
    )
    # Links where this order is the earlier/target side being closed
    links_to = relationship(
        "OrderLink",
        foreign_keys="OrderLink.to_order_id",
        back_populates="to_order",
        cascade="all, delete-orphan",
    )
