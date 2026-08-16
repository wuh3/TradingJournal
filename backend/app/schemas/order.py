from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.order import OrderDirection, OrderStatus
from app.schemas.image import ImageRead
from app.schemas.order_link import OrderLinkRead


class OrderCreate(BaseModel):
    ticker: str
    price: float
    quantity: float
    direction: OrderDirection
    status: OrderStatus = OrderStatus.FILLED
    note: str | None = None


class OrderUpdate(BaseModel):
    ticker: str | None = None
    price: float | None = None
    quantity: float | None = None
    direction: OrderDirection | None = None
    status: OrderStatus | None = None
    note: str | None = None


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    journal_id: int
    ticker: str
    price: float
    quantity: float
    direction: OrderDirection
    status: OrderStatus
    note: str | None
    created_at: datetime
    updated_at: datetime
    images: list[ImageRead] = []
    links_from: list[OrderLinkRead] = []
    links_to: list[OrderLinkRead] = []

    # Quantity still unmatched by any link (open remainder), computed by the API.
    open_quantity: float | None = None
