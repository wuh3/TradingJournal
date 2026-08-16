from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

InputType = Literal["number", "boolean"]


class PresetRead(BaseModel):
    key: str
    name: str
    description: str
    input_type: InputType


class FactorCreate(BaseModel):
    preset_key: str
    weight: float = Field(0, ge=0, le=100)
    sort_order: int = 0


class FactorUpdate(BaseModel):
    weight: float | None = Field(None, ge=0, le=100)
    sort_order: int | None = None


class FactorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    preset_key: str
    name: str
    description: str
    input_type: InputType
    weight: float
    sort_order: int


class CalculateRequest(BaseModel):
    # factor_id -> raw value (0/1 for boolean presets, raw indicator value for number presets)
    values: dict[int, float]


class FactorContribution(BaseModel):
    factor_id: int
    preset_key: str
    name: str
    raw_value: float
    normalized_value: float
    weight: float
    contribution: float


class CalculateResponse(BaseModel):
    score: float
    breakdown: list[FactorContribution]
