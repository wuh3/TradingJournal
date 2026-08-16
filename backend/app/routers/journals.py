from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.journal import Journal
from app.models.order import OrderItem, order_tags
from app.models.tag import Tag
from app.models.user import User
from app.schemas.journal import JournalCreate, JournalListItem, JournalRead, JournalUpdate

router = APIRouter(prefix="/api/journals", tags=["journals"])


def _get_owned_journal(db: Session, journal_id: int, user: User) -> Journal:
    journal = (
        db.query(Journal)
        .options(joinedload(Journal.orders).joinedload(OrderItem.tags), joinedload(Journal.images))
        .filter(Journal.id == journal_id, Journal.user_id == user.id)
        .first()
    )
    if journal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal not found")
    return journal


def _journal_tags(journal: Journal) -> list[Tag]:
    """A journal's tags are the union of its orders' tags -- computed at read
    time rather than stored, so there's a single source of truth (the order)
    and nothing to keep in sync."""
    seen: dict[int, Tag] = {}
    for order in journal.orders:
        for tag in order.tags:
            seen[tag.id] = tag
    return sorted(seen.values(), key=lambda t: t.name.lower())


def _to_read(journal: Journal) -> JournalRead:
    return JournalRead(
        id=journal.id,
        date=journal.date,
        notes=journal.notes,
        created_at=journal.created_at,
        updated_at=journal.updated_at,
        tags=_journal_tags(journal),
        orders=journal.orders,
        images=journal.images,
    )


@router.get("", response_model=list[JournalListItem])
def list_journals(
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    tag_id: list[int] | None = Query(default=None),
    search: str | None = Query(default=None, description="Matches journal notes or order tickers"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Journal)
        .options(joinedload(Journal.orders).joinedload(OrderItem.tags))
        .filter(Journal.user_id == current_user.id)
    )

    if date_from is not None:
        query = query.filter(Journal.date >= date_from)
    if date_to is not None:
        query = query.filter(Journal.date <= date_to)
    if tag_id:
        query = (
            query.join(Journal.orders)
            .join(order_tags, order_tags.c.order_id == OrderItem.id)
            .filter(order_tags.c.tag_id.in_(tag_id))
        )
    if search:
        like = f"%{search}%"
        query = query.outerjoin(Journal.orders).filter(
            (Journal.notes.ilike(like)) | (OrderItem.ticker.ilike(like))
        )

    journals = query.distinct().order_by(Journal.date.desc()).all()
    return [
        JournalListItem(
            id=j.id,
            date=j.date,
            notes=j.notes,
            created_at=j.created_at,
            tags=_journal_tags(j),
            order_count=len(j.orders),
        )
        for j in journals
    ]


@router.post("", response_model=JournalRead, status_code=status.HTTP_201_CREATED)
def create_journal(
    payload: JournalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    # One journal per calendar day. If one already exists for this date,
    # return it as-is instead of erroring -- the frontend treats "create" as
    # "create or open" and redirects to whatever journal comes back.
    existing = (
        db.query(Journal)
        .filter(Journal.user_id == current_user.id, Journal.date == payload.date)
        .first()
    )
    if existing is not None:
        return _to_read(_get_owned_journal(db, existing.id, current_user))

    journal = Journal(user_id=current_user.id, date=payload.date, notes=payload.notes)
    db.add(journal)
    db.commit()
    db.refresh(journal)
    return _to_read(_get_owned_journal(db, journal.id, current_user))


@router.get("/{journal_id}", response_model=JournalRead)
def get_journal(journal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _to_read(_get_owned_journal(db, journal_id, current_user))


@router.patch("/{journal_id}", response_model=JournalRead)
def update_journal(
    journal_id: int,
    payload: JournalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    journal = _get_owned_journal(db, journal_id, current_user)
    if payload.date is not None and payload.date != journal.date:
        conflict = (
            db.query(Journal)
            .filter(Journal.user_id == current_user.id, Journal.date == payload.date, Journal.id != journal_id)
            .first()
        )
        if conflict is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="A journal already exists for that date"
            )
        journal.date = payload.date
    if payload.notes is not None:
        journal.notes = payload.notes
    db.commit()
    return _to_read(_get_owned_journal(db, journal_id, current_user))


@router.delete("/{journal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_journal(journal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    journal = _get_owned_journal(db, journal_id, current_user)
    db.delete(journal)
    db.commit()
