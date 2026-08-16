from datetime import datetime

from pydantic import BaseModel


class ClosedLotRead(BaseModel):
    link_id: int
    ticker: str
    quantity: float
    buy_order_id: int
    buy_price: float
    sell_order_id: int
    sell_price: float
    realized_pnl: float
    closed_at: datetime


class PnlSummary(BaseModel):
    total_realized_pnl: float
    closed_lot_count: int
    closed_lots: list[ClosedLotRead]
