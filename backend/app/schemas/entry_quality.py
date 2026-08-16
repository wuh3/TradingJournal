from pydantic import BaseModel, ConfigDict, model_validator

from app.models.entry_quality import FactorType


class FactorCreate(BaseModel):
    name: str
    factor_type: FactorType
    weight: float = 0
    min_value: float | None = None
    max_value: float | None = None
    sort_order: int = 0

    @model_validator(mode="after")
    def check_number_bounds(self):
        if self.factor_type == FactorType.NUMBER:
            if self.min_value is None or self.max_value is None:
                raise ValueError("min_value and max_value are required for number factors")
            if self.max_value <= self.min_value:
                raise ValueError("max_value must be greater than min_value")
        return self


class FactorUpdate(BaseModel):
    name: str | None = None
    weight: float | None = None
    min_value: float | None = None
    max_value: float | None = None
    sort_order: int | None = None


class FactorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    factor_type: FactorType
    weight: float
    min_value: float | None
    max_value: float | None
    sort_order: int


class CalculateRequest(BaseModel):
    # factor_id -> raw value (0/1 for boolean, raw number for number factors)
    values: dict[int, float]


class FactorContribution(BaseModel):
    factor_id: int
    name: str
    raw_value: float
    normalized_value: float
    weight: float
    contribution: float


class CalculateResponse(BaseModel):
    score: float
    breakdown: list[FactorContribution]
