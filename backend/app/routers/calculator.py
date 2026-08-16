from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.factor_presets import PRESETS, PRESETS_BY_KEY
from app.models.entry_quality import EntryQualityFactor
from app.models.user import User
from app.schemas.entry_quality import (
    CalculateRequest,
    CalculateResponse,
    FactorContribution,
    FactorCreate,
    FactorRead,
    FactorUpdate,
    PresetRead,
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


def _to_read(factor: EntryQualityFactor) -> FactorRead:
    preset = PRESETS_BY_KEY.get(factor.preset_key)
    if preset is None:
        # The preset was removed from the code registry after this factor was
        # created. Surface it clearly rather than crashing.
        return FactorRead(
            id=factor.id,
            preset_key=factor.preset_key,
            name=f"Unknown preset ({factor.preset_key})",
            description="This preset no longer exists. Remove it and add a current one.",
            input_type="number",
            weight=float(factor.weight),
            sort_order=factor.sort_order,
        )
    return FactorRead(
        id=factor.id,
        preset_key=factor.preset_key,
        name=preset.name,
        description=preset.description,
        input_type=preset.input_type,
        weight=float(factor.weight),
        sort_order=factor.sort_order,
    )


@router.get("/presets", response_model=list[PresetRead])
def list_presets(current_user: User = Depends(get_current_user)):
    return [
        PresetRead(key=p.key, name=p.name, description=p.description, input_type=p.input_type) for p in PRESETS
    ]


@router.get("/factors", response_model=list[FactorRead])
def list_factors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    factors = (
        db.query(EntryQualityFactor)
        .filter(EntryQualityFactor.user_id == current_user.id)
        .order_by(EntryQualityFactor.sort_order, EntryQualityFactor.id)
        .all()
    )
    return [_to_read(f) for f in factors]


@router.post("/factors", response_model=FactorRead, status_code=status.HTTP_201_CREATED)
def create_factor(
    payload: FactorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if payload.preset_key not in PRESETS_BY_KEY:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown preset_key")

    existing = (
        db.query(EntryQualityFactor)
        .filter(EntryQualityFactor.user_id == current_user.id, EntryQualityFactor.preset_key == payload.preset_key)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This preset has already been added")

    factor = EntryQualityFactor(
        user_id=current_user.id,
        preset_key=payload.preset_key,
        weight=payload.weight,
        sort_order=payload.sort_order,
    )
    db.add(factor)
    db.commit()
    db.refresh(factor)
    return _to_read(factor)


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
    return _to_read(factor)


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
    # Track the true achievable min/max of weighted_sum for the *active* set of
    # factors (each factor's own score_range times its weight), rather than
    # assuming every factor tops out at 1.0. Directional presets (RSI, Fear &
    # Greed) can score up to 1.5 or down to -1.5, so a fixed [0, weight_total]
    # denominator would let the final score drift outside 0-100. Rescaling by
    # the actual min/max keeps the score exactly within 0-100 regardless of
    # which mix of boolean/plain-linear/directional factors are active.
    min_possible = 0.0
    max_possible = 0.0

    for factor in factors:
        weight = float(factor.weight)
        if weight == 0:
            continue

        preset = PRESETS_BY_KEY.get(factor.preset_key)
        if preset is None:
            continue  # stale preset reference (removed from the registry) -- skip rather than crash

        if factor.id in payload.values:
            raw_value = payload.values[factor.id]
        elif preset.input_type == "boolean":
            # An untouched checkbox is still an explicit "false", not "no
            # opinion" -- it must count as a discouraging -1 signal (see
            # _boolean), not be silently excluded from the calculation as if
            # the factor weren't added at all. Number factors have no such
            # natural default, so they're still skipped below when absent.
            raw_value = 0.0
        else:
            continue

        lo, hi = preset.score_range
        normalized = max(lo, min(hi, preset.score_fn(raw_value)))

        contribution = weight * normalized
        weighted_sum += contribution
        min_possible += weight * lo
        max_possible += weight * hi

        breakdown.append(
            FactorContribution(
                factor_id=factor.id,
                preset_key=factor.preset_key,
                name=preset.name,
                raw_value=raw_value,
                normalized_value=normalized,
                weight=weight,
                contribution=contribution,
            )
        )

    span = max_possible - min_possible
    score = ((weighted_sum - min_possible) / span * 100) if span > 0 else 0.0
    return CalculateResponse(score=round(score, 2), breakdown=breakdown)
