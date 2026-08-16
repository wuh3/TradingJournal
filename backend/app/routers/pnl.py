from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.journal import Journal
from app.models.order import OrderItem
from app.models.order_link import OrderLink
from app.models.user import User
from app.schemas.pnl import ClosedLotRead, PnlSummary

router = APIRouter(prefix="/api/pnl", tags=["pnl"])


@router.get("", response_model=PnlSummary)
def get_pnl_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    links = (
        db.query(OrderLink)
        .join(OrderItem, OrderLink.from_order_id == OrderItem.id)
        .join(Journal, OrderItem.journal_id == Journal.id)
        .options(joinedload(OrderLink.from_order), joinedload(OrderLink.to_order))
        .filter(Journal.user_id == current_user.id)
        .order_by(OrderLink.created_at.desc())
        .all()
    )

    closed_lots: list[ClosedLotRead] = []
    total = 0.0
    for link in links:
        from_order, to_order = link.from_order, link.to_order
        if from_order.direction == "sell":
            sell_order, buy_order = from_order, to_order
        else:
            sell_order, buy_order = to_order, from_order

        pnl = float(link.quantity) * (float(sell_order.price) - float(buy_order.price))
        total += pnl
        closed_lots.append(
            ClosedLotRead(
                link_id=link.id,
                ticker=from_order.ticker,
                quantity=float(link.quantity),
                buy_order_id=buy_order.id,
                buy_price=float(buy_order.price),
                sell_order_id=sell_order.id,
                sell_price=float(sell_order.price),
                realized_pnl=pnl,
                closed_at=link.created_at,
            )
        )

    return PnlSummary(total_realized_pnl=total, closed_lot_count=len(closed_lots), closed_lots=closed_lots)
