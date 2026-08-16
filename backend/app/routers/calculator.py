from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.entry_quality import EntryQualityFactor, FactorType
from app.models.user import User
from app.schemas.entry_quality import (
    CalculateRequest,
    CalculateResponse,
    FactorContribution,
    FactorCreate,
    FactorRead,
    FactorUpdate,
)

router = APIRouter(prefix="/api/calculator", tags=["calculator"])


def _get_owned_factor(db: Session, factor_id: int, user: User) -> EntryQualityFactor:
    factor = (
        db.query(EntryQualityFactor)
        .filter(EntryQualityFactor.id == factor_id, EntryQualityFactor.user_id == user.id)
        .first()
    )
    if factor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factor not found")
    return factor


@router.get("/factors", response_model=list[FactorRead])
def list_factors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(EntryQualityFactor)
        .filter(EntryQualityFactor.user_id == current_user.id)
        .order_by(EntryQualityFactor.sort_order, EntryQualityFactor.id)
        .all()
    )


@router.post("/factors", response_model=FactorRead, status_code=status.HTTP_201_CREATED)
def create_factor(
    payload: FactorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    factor = EntryQualityFactor(user_id=current_user.id, **payload.model_dump())
    db.add(factor)
    db.commit()
    db.refresh(factor)
    return factor


@router.patch("/factors/{factor_id}", response_model=FactorRead)
def update_factor(
    factor_id: int,
    payload: FactorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    factor = _get_owned_factor(db, factor_id, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(factor, field, value)
    db.commit()
    db.refresh(factor)
    return factor


@router.delete("/factors/{factor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_factor(factor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    factor = _get_owned_factor(db, factor_id, current_user)
    db.delete(factor)
    db.commit()


@router.post("/calculate", response_model=CalculateResponse)
def calculate(
    payload: CalculateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    factors = db.query(EntryQualityFactor).filter(EntryQualityFactor.user_id == current_user.id).all()

    breakdown: list[FactorContribution] = []
    weighted_sum = 0.0
    weight_total = 0.0

    for factor in factors:
        weight = float(factor.weight)
        if weight == 0:
            continue
        if factor.id not in payload.values:
            continue

        raw_value = payload.values[factor.id]

        if factor.factor_type == FactorType.BOOLEAN:
            normalized = 1.0 if raw_value else 0.0
        else:
            lo, hi = float(factor.min_value), float(factor.max_value)
            normalized = (raw_value - lo) / (hi - lo)
            normalized = max(0.0, min(1.0, normalized))

        contribution = weight * normalized
        weighted_sum += contribution
        weight_total += weight

        breakdown.append(
            FactorContribution(
                factor_id=factor.id,
                name=factor.name,
                raw_value=raw_value,
                normalized_value=normalized,
                weight=weight,
                contribution=contribution,
            )
        )

    score = (weighted_sum / weight_total * 100) if weight_total > 0 else 0.0
    return CalculateResponse(score=round(score, 2), breakdown=breakdown)
