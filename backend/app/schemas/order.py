from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import OrderDirection, OrderStatus, PositionType
from app.schemas.image import ImageRead
from app.schemas.order_link import OrderLinkRead
from app.schemas.tag import TagRead


class OrderCreate(BaseModel):
    ticker: str
    price: float
    quantity: float
    direction: OrderDirection
    position_type: PositionType
    status: OrderStatus = OrderStatus.FILLED
    note: str | None = None
    quality_score: float | None = Field(default=None, ge=0, le=100)
    tag_ids: list[int] = []


class OrderUpdate(BaseModel):
    ticker: str | None = None
    price: float | None = None
    quantity: float | None = None
    direction: OrderDirection | None = None
    position_type: PositionType | None = None
    status: OrderStatus | None = None
    note: str | None = None
    quality_score: float | None = Field(default=None, ge=0, le=100)
    tag_ids: list[int] | None = None


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    journal_id: int
    ticker: str
    price: float
    quantity: float
    direction: OrderDirection
    position_type: PositionType
    status: OrderStatus
    note: str | None
    quality_score: float | None
    created_at: datetime
    updated_at: datetime
    tags: list[TagRead] = []
    images: list[ImageRead] = []
    links_from: list[OrderLinkRead] = []
    links_to: list[OrderLinkRead] = []

    # Quantity still unmatched by any link (open remainder), computed by the API.
    open_quantity: float | None = None


class OrderListItem(BaseModel):
    """Slim row shape for the paginated, cross-journal Orders page."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    journal_id: int
    date: date_type
    ticker: str
    price: float
    quantity: float
    direction: OrderDirection
    position_type: PositionType
    quality_score: float | None
    tags: list[TagRead] = []


class OrderListResponse(BaseModel):
    items: list[OrderListItem]
    total: int
    page: int
    page_size: int
