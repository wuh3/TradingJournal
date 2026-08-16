"""
Preset catalog for the EntryQualityCalculator.

Instead of letting the user freely define arbitrary factors with a generic
min/max normalization (which can't express indicator-specific logic, e.g.
"low RSI is good for a long, high RSI is good for a short"), each factor is
one of a fixed set of presets defined here in code. Every preset owns its
own raw-value -> normalized-score ([0, 1]) function, so indicator-specific
scoring logic lives in one place and the user just picks presets from a
searchable list and assigns a weight (0-100) to each.

To add a new preset: add a FactorPreset entry to PRESETS below. No schema
change needed -- EntryQualityFactor rows just reference a preset by key.
"""

from dataclasses import dataclass
from typing import Callable, Literal

InputType = Literal["number", "boolean"]


@dataclass(frozen=True)
class FactorPreset:
    key: str
    name: str
    description: str
    input_type: InputType
    score_fn: Callable[[float], float]  # raw value -> normalized score in [0, 1]


def _linear(raw: float, lo: float, hi: float, ascending: bool) -> float:
    """Clamp-linear normalize `raw` into [0, 1] over [lo, hi]. ascending=False inverts."""
    if hi == lo:
        return 0.0
    t = (raw - lo) / (hi - lo)
    t = max(0.0, min(1.0, t))
    return t if ascending else 1.0 - t


def _boolean(raw: float) -> float:
    return 1.0 if raw else 0.0


PRESETS: list[FactorPreset] = [
    # --- Number factors ---
    FactorPreset(
        key="long_rsi",
        name="Long RSI",
        description=(
            "RSI reading for a long entry. Lower is more favorable -- below 20 "
            "(oversold) is considered okay, and the lower the better. Scaled "
            "linearly over RSI's natural 0-100 range."
        ),
        input_type="number",
        score_fn=lambda raw: _linear(raw, 0, 100, ascending=False),
    ),
    FactorPreset(
        key="short_rsi",
        name="Short RSI",
        description=(
            "RSI reading for a short entry. Higher is more favorable -- 90+ "
            "(overbought) is considered okay, and the higher the better. Scaled "
            "linearly over RSI's natural 0-100 range."
        ),
        input_type="number",
        score_fn=lambda raw: _linear(raw, 0, 100, ascending=True),
    ),
    FactorPreset(
        key="long_fear_greed",
        name="Long Fear & Greed",
        description=(
            "Fear & Greed Index for a long entry. Lower is more favorable -- "
            "below 20 (extreme fear) is considered good, and the lower the "
            "better. Scaled linearly over the index's natural 0-100 range."
        ),
        input_type="number",
        score_fn=lambda raw: _linear(raw, 0, 100, ascending=False),
    ),
    FactorPreset(
        key="short_fear_greed",
        name="Short Fear & Greed",
        description=(
            "Fear & Greed Index for a short entry. Higher is more favorable -- "
            "above 60 (greed) is considered good, and the higher the better. "
            "Scaled linearly over the index's natural 0-100 range."
        ),
        input_type="number",
        score_fn=lambda raw: _linear(raw, 0, 100, ascending=True),
    ),
    FactorPreset(
        key="short_pe",
        name="Short P/E",
        description=(
            "Price/Earnings ratio for a short entry. Higher is more favorable -- "
            "above 100 is considered overbought, and the higher the better. "
            "ASSUMPTION: scaled linearly over 0-150 (P/E has no natural upper "
            "bound like RSI/Fear&Greed) -- edit the range in "
            "app/core/factor_presets.py if your typical range differs."
        ),
        input_type="number",
        score_fn=lambda raw: _linear(raw, 0, 150, ascending=True),
    ),
    FactorPreset(
        key="num_of_confluence",
        name="Number of Confluences",
        description=(
            "How many key levels overlap at the current price level. 2+ is "
            "considered good, and the more the better. ASSUMPTION: scaled "
            "linearly over 0-5 (5+ counts as max score) -- edit the range in "
            "app/core/factor_presets.py if you regularly see more."
        ),
        input_type="number",
        score_fn=lambda raw: _linear(raw, 0, 5, ascending=True),
    ),
    # --- Boolean factors ---
    FactorPreset(
        key="on_fib",
        name="On Fibonacci Level",
        description="Price is sitting on a Fibonacci retracement/extension level.",
        input_type="boolean",
        score_fn=_boolean,
    ),
    FactorPreset(
        key="on_moving_average",
        name="On Moving Average",
        description="Price is sitting on a moving average.",
        input_type="boolean",
        score_fn=_boolean,
    ),
    FactorPreset(
        key="outside_values",
        name="Outside Values",
        description="Price is outside the (prior) value area/range.",
        input_type="boolean",
        score_fn=_boolean,
    ),
    FactorPreset(
        key="sweep_equal_lvls",
        name="Swept Equal Levels",
        description="Price swept equal highs/lows going into this entry.",
        input_type="boolean",
        score_fn=_boolean,
    ),
    FactorPreset(
        key="gap_close",
        name="Gap Close",
        description="Entry is at/near a price gap close.",
        input_type="boolean",
        score_fn=_boolean,
    ),
    FactorPreset(
        key="on_timeframe_lvls",
        name="On Timeframe Levels",
        description="Price is on a key level from a higher timeframe.",
        input_type="boolean",
        score_fn=_boolean,
    ),
    FactorPreset(
        key="on_vwap",
        name="On VWAP",
        description="Price is sitting on VWAP.",
        input_type="boolean",
        score_fn=_boolean,
    ),
]

PRESETS_BY_KEY: dict[str, FactorPreset] = {p.key: p for p in PRESETS}
