from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class OrderLink(Base):
    """
    Manual link between two orders on the same ticker, e.g. a sell that
    closes/reduces an earlier buy. `quantity` supports partial closes: one
    order can be the target (`to_order`) of multiple links until its full
    quantity has been accounted for.
    """

    __tablename__ = "order_links"
    __table_args__ = (
        CheckConstraint("from_order_id != to_order_id", name="ck_order_link_no_self_link"),
        CheckConstraint("quantity > 0", name="ck_order_link_positive_quantity"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    from_order_id: Mapped[int] = mapped_column(ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    to_order_id: Mapped[int] = mapped_column(ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    from_order = relationship("OrderItem", foreign_keys=[from_order_id], back_populates="links_from")
    to_order = relationship("OrderItem", foreign_keys=[to_order_id], back_populates="links_to")
