from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.image import ImageRead
from app.schemas.order import OrderRead
from app.schemas.tag import TagRead


class JournalCreate(BaseModel):
    date: date_type
    notes: str | None = None
    tag_ids: list[int] = []


class JournalUpdate(BaseModel):
    date: date_type | None = None
    notes: str | None = None
    tag_ids: list[int] | None = None


class JournalListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date_type
    notes: str | None
    created_at: datetime
    tags: list[TagRead] = []
    order_count: int = 0


class JournalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date_type
    notes: str | None
    created_at: datetime
    updated_at: datetime
    tags: list[TagRead] = []
    orders: list[OrderRead] = []
    images: list[ImageRead] = []
