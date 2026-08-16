"""
Preset catalog for the EntryQualityCalculator.

Instead of letting the user freely define arbitrary factors with a generic
min/max normalization (which can't express indicator-specific logic, e.g.
"low RSI is good for a long, high RSI is good for a short"), each factor is
one of a fixed set of presets defined here in code. Every preset owns its
own raw-value -> normalized-score function, so indicator-specific scoring
logic lives in one place and the user just picks presets from a searchable
list and assigns a weight (0-100) to each.

Scoring model
-------------
Every preset declares a `score_range` (min, max) alongside its `score_fn`.
Boolean presets score in [-1, 1]: true is a confirming +1, false is an
actively discouraging -1 -- not just "no contribution". Plain-linear
number presets (no natural opposite "bad" extreme) still score in [0, 1].
Directional threshold presets (RSI, Fear & Greed) score in [-1.5, 1.5]: a
value at the "good enough" bound scores exactly 1.0 -- the same *raw*
score a true boolean gets when on -- but an extreme reading past the bound
can earn a bonus up to 1.5x, and a reading on the wrong side of the bound
is a discouraging signal that can go as low as -1.5x. This lets a single,
especially strong/weak indicator outweigh (or undercut) a same-weight
boolean factor in the weighted sum, instead of being capped at a flat
[0, 1] range like the old plain-linear model.

The calculator (see app/routers/calculator.py) uses each active factor's
declared `score_range` -- not a hardcoded [0, 1] -- to compute the true
achievable min/max of the weighted sum for the *current* set of factors,
then rescales into 0-100. That keeps the final displayed score exactly
within 0-100 regardless of the mix of boolean/plain-linear/directional
factors added, without ever clamping the true score and losing
information. One consequence: because a directional preset's achievable
range (3.0 wide) is larger than a boolean's (1.0 wide), landing exactly
"at the bound" on a lone directional factor will NOT show as 100/100 --
its own 1.0 only accounts for 83% of its own -1.5..1.5 range. The score is
always relative to the best/worst the *currently active* factors could
achieve, same as it was pre-redesign (adding/removing factors already
shifted the scale then); this redesign just extends that to a wider,
asymmetric range for directional presets.

To add a new preset: add a FactorPreset entry to PRESETS below. No schema
change needed -- EntryQualityFactor rows just reference a preset by key.
"""

import math
from dataclasses import dataclass, field
from typing import Callable, Literal

InputType = Literal["number", "boolean"]

# Curvature of the directional exponential-decay curve used by RSI/Fear&Greed
# style presets below. Higher = more front-loaded (score rises/falls fast
# right past the bound, then levels off approaching the extreme). Lower =
# closer to a straight line. 0 would be exactly linear. Tune here if the
# curve should feel more or less aggressive -- it applies to every
# directional preset uniformly.
DECAY_STEEPNESS = 2.5


@dataclass(frozen=True)
class FactorPreset:
    key: str
    name: str
    description: str
    input_type: InputType
    score_fn: Callable[[float], float]  # raw value -> normalized score
    # The true min/max `score_fn` can return. Booleans are [-1, 1]; plain-linear
    # number presets are [0, 1] (the dataclass default, used where not overridden);
    # directional presets are [-1.5, 1.5]. Used by the calculator to rescale the
    # weighted sum into 0-100.
    score_range: tuple[float, float] = field(default=(0.0, 1.0))


def _linear(raw: float, lo: float, hi: float, ascending: bool) -> float:
    """Clamp-linear normalize `raw` into [0, 1] over [lo, hi]. ascending=False inverts."""
    if hi == lo:
        return 0.0
    t = (raw - lo) / (hi - lo)
    t = max(0.0, min(1.0, t))
    return t if ascending else 1.0 - t


def _boolean(raw: float) -> float:
    """True scores +1 (a confirming signal); false scores -1 (a discouraging signal,
    not just "no contribution") -- same spirit as the directional presets above,
    where being on the wrong side of the bound actively hurts rather than sitting at 0."""
    return 1.0 if raw else -1.0


def _exp_progress(p: float, k: float = DECAY_STEEPNESS) -> float:
    """Exponential-decay shaped progress curve on [0, 1] -> [0, 1] (p=0 -> 0, p=1 -> 1)."""
    p = max(0.0, min(1.0, p))
    if k == 0:
        return p
    return (1 - math.exp(-k * p)) / (1 - math.exp(-k))


def _directional_exp(
    bound: float,
    extreme_good: float,
    extreme_bad: float,
    good_cap: float = 1.5,
    bad_cap: float = -1.5,
    base: float = 1.0,
    k: float = DECAY_STEEPNESS,
) -> Callable[[float], float]:
    """
    Build a score_fn for a directional indicator with a "good enough" bound.

    - At raw == bound: score == base (on par with a boolean factor at full weight).
    - Moving from bound toward extreme_good: score rises along an exponential-decay
      curve up to good_cap (a bonus beyond what a boolean can contribute).
    - Moving from bound toward extreme_bad: score falls along the same curve shape
      down to bad_cap -- past the bound is a discouraging signal, not just a "no".

    `extreme_good`/`extreme_bad` can be on either side of `bound` -- e.g. for a long
    entry, low RSI is good (extreme_good=0 < bound=20 < extreme_bad=100); for a short
    entry it's mirrored (extreme_bad=0 < bound=90 < extreme_good=100).
    """
    good_direction = extreme_good - bound

    def score_fn(raw: float) -> float:
        if good_direction == 0:
            return base
        on_good_side = (raw - bound) * good_direction >= 0
        if on_good_side:
            span = extreme_good - bound
            p = 0.0 if span == 0 else (raw - bound) / span
            return base + (good_cap - base) * _exp_progress(p, k)
        else:
            span = extreme_bad - bound
            p = 0.0 if span == 0 else (raw - bound) / span
            return base + (bad_cap - base) * _exp_progress(p, k)

    return score_fn


PRESETS: list[FactorPreset] = [
    # --- Number factors: directional exponential (bound -> 1.0, extreme-good -> 1.5, extreme-bad -> -1.5) ---
    FactorPreset(
        key="long_rsi",
        name="Long RSI",
        description=(
            "RSI reading for a long entry. 20 is the 'oversold-good' bound and scores "
            "1.0 (the same raw score a true boolean gets when on). Below 20, the lower the better -- score "
            "rises along an exponential-decay curve up to 1.5 as RSI approaches 0. Above "
            "20 is a discouraging signal -- score falls the same way down to -1.5 at RSI 100."
        ),
        input_type="number",
        score_fn=_directional_exp(bound=20, extreme_good=0, extreme_bad=100),
        score_range=(-1.5, 1.5),
    ),
    FactorPreset(
        key="short_rsi",
        name="Short RSI",
        description=(
            "RSI reading for a short entry. 90 is the 'overbought-good' bound and scores "
            "1.0 (the same raw score a true boolean gets when on). Above 90, the higher the better -- score "
            "rises along an exponential-decay curve up to 1.5 as RSI approaches 100. Below "
            "90 is a discouraging signal -- score falls the same way down to -1.5 at RSI 0."
        ),
        input_type="number",
        score_fn=_directional_exp(bound=90, extreme_good=100, extreme_bad=0),
        score_range=(-1.5, 1.5),
    ),
    FactorPreset(
        key="long_fear_greed",
        name="Long Fear & Greed",
        description=(
            "Fear & Greed Index for a long entry. 20 is the 'extreme fear-good' bound and "
            "scores 1.0. Below 20, the lower the better -- score rises along an "
            "exponential-decay curve up to 1.5 as the index approaches 0. Above 20 is a "
            "discouraging signal -- score falls the same way down to -1.5 at index 100."
        ),
        input_type="number",
        score_fn=_directional_exp(bound=20, extreme_good=0, extreme_bad=100),
        score_range=(-1.5, 1.5),
    ),
    FactorPreset(
        key="short_fear_greed",
        name="Short Fear & Greed",
        description=(
            "Fear & Greed Index for a short entry. 60 is the 'greed-good' bound and "
            "scores 1.0. Above 60, the higher the better -- score rises along an "
            "exponential-decay curve up to 1.5 as the index approaches 100. Below 60 is a "
            "discouraging signal -- score falls the same way down to -1.5 at index 0."
        ),
        input_type="number",
        score_fn=_directional_exp(bound=60, extreme_good=100, extreme_bad=0),
        score_range=(-1.5, 1.5),
    ),
    # --- Number factors: plain linear 0-1 (no natural opposite "discouraging" extreme) ---
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
    # --- Boolean factors: true -> +1, false -> -1 (discouraging, not neutral) ---
    FactorPreset(
        key="on_fib",
        name="On Fibonacci Level",
        description="Price is sitting on a Fibonacci retracement/extension level.",
        input_type="boolean",
        score_fn=_boolean,
        score_range=(-1.0, 1.0),
    ),
    FactorPreset(
        key="on_moving_average",
        name="On Moving Average",
        description="Price is sitting on a moving average.",
        input_type="boolean",
        score_fn=_boolean,
        score_range=(-1.0, 1.0),
    ),
    FactorPreset(
        key="outside_values",
        name="Outside Values",
        description="Price is outside the (prior) value area/range.",
        input_type="boolean",
        score_fn=_boolean,
        score_range=(-1.0, 1.0),
    ),
    FactorPreset(
        key="sweep_equal_lvls",
        name="Swept Equal Levels",
        description="Price swept equal highs/lows going into this entry.",
        input_type="boolean",
        score_fn=_boolean,
        score_range=(-1.0, 1.0),
    ),
    FactorPreset(
        key="gap_close",
        name="Gap Close",
        description="Entry is at/near a price gap close.",
        input_type="boolean",
        score_fn=_boolean,
        score_range=(-1.0, 1.0),
    ),
    FactorPreset(
        key="on_timeframe_lvls",
        name="On Timeframe Levels",
        description="Price is on a key level from a higher timeframe.",
        input_type="boolean",
        score_fn=_boolean,
        score_range=(-1.0, 1.0),
    ),
    FactorPreset(
        key="on_vwap",
        name="On VWAP",
        description="Price is sitting on VWAP.",
        input_type="boolean",
        score_fn=_boolean,
        score_range=(-1.0, 1.0),
    ),
]

PRESETS_BY_KEY: dict[str, FactorPreset] = {p.key: p for p in PRESETS}
