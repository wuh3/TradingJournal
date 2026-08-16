from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OrderLinkCreate(BaseModel):
    to_order_id: int
    quantity: float


class OrderLinkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_order_id: int
    to_order_id: int
    quantity: float
    created_at: datetime
    realized_pnl: float | None = None
