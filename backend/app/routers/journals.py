from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.journal import Journal
from app.models.order import OrderItem
from app.models.tag import Tag
from app.models.user import User
from app.schemas.journal import JournalCreate, JournalListItem, JournalRead, JournalUpdate

router = APIRouter(prefix="/api/journals", tags=["journals"])


def _get_owned_journal(db: Session, journal_id: int, user: User) -> Journal:
    journal = (
        db.query(Journal)
        .options(joinedload(Journal.tags), joinedload(Journal.orders), joinedload(Journal.images))
        .filter(Journal.id == journal_id, Journal.user_id == user.id)
        .first()
    )
    if journal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal not found")
    return journal


def _set_tags(db: Session, journal: Journal, tag_ids: list[int], user: User) -> None:
    if not tag_ids:
        journal.tags = []
        return
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids), Tag.user_id == user.id).all()
    if len(tags) != len(set(tag_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more tag_ids are invalid")
    journal.tags = tags


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
        .options(joinedload(Journal.tags), joinedload(Journal.orders))
        .filter(Journal.user_id == current_user.id)
    )

    if date_from is not None:
        query = query.filter(Journal.date >= date_from)
    if date_to is not None:
        query = query.filter(Journal.date <= date_to)
    if tag_id:
        query = query.join(Journal.tags).filter(Tag.id.in_(tag_id))
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
            tags=j.tags,
            order_count=len(j.orders),
        )
        for j in journals
    ]


@router.post("", response_model=JournalRead, status_code=status.HTTP_201_CREATED)
def create_journal(
    payload: JournalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    journal = Journal(user_id=current_user.id, date=payload.date, notes=payload.notes)
    _set_tags(db, journal, payload.tag_ids, current_user)
    db.add(journal)
    db.commit()
    db.refresh(journal)
    return journal


@router.get("/{journal_id}", response_model=JournalRead)
def get_journal(journal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_owned_journal(db, journal_id, current_user)


@router.patch("/{journal_id}", response_model=JournalRead)
def update_journal(
    journal_id: int,
    payload: JournalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    journal = _get_owned_journal(db, journal_id, current_user)
    if payload.date is not None:
        journal.date = payload.date
    if payload.notes is not None:
        journal.notes = payload.notes
    if payload.tag_ids is not None:
        _set_tags(db, journal, payload.tag_ids, current_user)
    db.commit()
    db.refresh(journal)
    return journal


@router.delete("/{journal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_journal(journal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    journal = _get_owned_journal(db, journal_id, current_user)
    db.delete(journal)
    db.commit()
