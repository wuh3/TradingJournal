from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.journal import Journal
from app.models.order import OrderItem
from app.models.order_link import OrderLink
from app.models.user import User
from app.schemas.order import OrderCreate, OrderRead, OrderUpdate
from app.schemas.order_link import OrderLinkCreate, OrderLinkRead

router = APIRouter(tags=["orders"])


def _open_quantity(order: OrderItem) -> float:
    used = sum(float(l.quantity) for l in order.links_from) + sum(float(l.quantity) for l in order.links_to)
    return float(order.quantity) - used


def _to_read(order: OrderItem) -> OrderRead:
    data = OrderRead.model_validate(order)
    data.open_quantity = _open_quantity(order)
    return data


def _realized_pnl(from_order: OrderItem, to_order: OrderItem, quantity: float) -> float:
    """
    P&L for `quantity` shares closed by linking `from_order` (the newer,
    closing order) to `to_order` (the earlier order being closed/reduced).
    Whichever of the two is the 'sell' side is the exit price; the other is
    the entry price. Directions are validated as opposite before this runs.
    """
    if from_order.direction == "sell":
        sell_price, buy_price = float(from_order.price), float(to_order.price)
    else:
        sell_price, buy_price = float(to_order.price), float(from_order.price)
    return float(quantity) * (sell_price - buy_price)


def _get_owned_order(db: Session, order_id: int, user: User) -> OrderItem:
    order = (
        db.query(OrderItem)
        .join(Journal)
        .options(
            joinedload(OrderItem.images),
            joinedload(OrderItem.links_from),
            joinedload(OrderItem.links_to),
        )
        .filter(OrderItem.id == order_id, Journal.user_id == user.id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def _get_owned_journal(db: Session, journal_id: int, user: User) -> Journal:
    journal = db.query(Journal).filter(Journal.id == journal_id, Journal.user_id == user.id).first()
    if journal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal not found")
    return journal


@router.post(
    "/api/journals/{journal_id}/orders", response_model=OrderRead, status_code=status.HTTP_201_CREATED
)
def create_order(
    journal_id: int,
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_journal(db, journal_id, current_user)
    order = OrderItem(journal_id=journal_id, **payload.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return _to_read(order)


@router.get("/api/orders/linkable", response_model=list[OrderRead])
def linkable_orders(
    ticker: str = Query(...),
    exclude_order_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Orders on the given ticker with remaining open quantity, for the manual link picker."""
    query = (
        db.query(OrderItem)
        .join(Journal)
        .options(joinedload(OrderItem.links_from), joinedload(OrderItem.links_to))
        .filter(Journal.user_id == current_user.id, OrderItem.ticker == ticker)
    )
    if exclude_order_id is not None:
        query = query.filter(OrderItem.id != exclude_order_id)

    candidates = [_to_read(o) for o in query.all()]
    return [c for c in candidates if c.open_quantity is not None and c.open_quantity > 0]


@router.get("/api/orders/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _to_read(_get_owned_order(db, order_id, current_user))


@router.patch("/api/orders/{order_id}", response_model=OrderRead)
def update_order(
    order_id: int,
    payload: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = _get_owned_order(db, order_id, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(order, field, value)
    db.commit()
    db.refresh(order)
    return _to_read(order)


@router.delete("/api/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = _get_owned_order(db, order_id, current_user)
    db.delete(order)
    db.commit()


@router.post(
    "/api/orders/{order_id}/links", response_model=OrderLinkRead, status_code=status.HTTP_201_CREATED
)
def create_link(
    order_id: int,
    payload: OrderLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from_order = _get_owned_order(db, order_id, current_user)
    to_order = _get_owned_order(db, payload.to_order_id, current_user)

    if from_order.id == to_order.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot link an order to itself")
    if from_order.ticker != to_order.ticker:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Orders must be on the same ticker")
    if from_order.direction == to_order.direction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Linked orders must be opposite directions (one buy, one sell)",
        )
    if payload.quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="quantity must be positive")

    if payload.quantity > _open_quantity(from_order):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity exceeds open quantity on the linking order")
    if payload.quantity > _open_quantity(to_order):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity exceeds open quantity on the target order")

    link = OrderLink(from_order_id=from_order.id, to_order_id=to_order.id, quantity=payload.quantity)
    db.add(link)
    db.commit()
    db.refresh(link)

    result = OrderLinkRead.model_validate(link)
    result.realized_pnl = _realized_pnl(from_order, to_order, payload.quantity)
    return result


@router.delete("/api/orders/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(link_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    link = (
        db.query(OrderLink)
        .join(OrderItem, OrderLink.from_order_id == OrderItem.id)
        .join(Journal)
        .filter(OrderLink.id == link_id, Journal.user_id == current_user.id)
        .first()
    )
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    db.delete(link)
    db.commit()
