"""Money helpers. All amounts in the system are Decimal(18, 4)."""
from decimal import Decimal, ROUND_HALF_UP

ZERO = Decimal("0.0000")
QUANTUM = Decimal("0.0001")


def to_money(value) -> Decimal:
    """Coerce any numeric to our standard quantum. Never use float."""
    if value is None:
        return ZERO
    if isinstance(value, float):
        # Forbid silent float coercion — caller passed something dangerous.
        raise TypeError("Money values must not originate from float — use Decimal or str.")
    return Decimal(value).quantize(QUANTUM, rounding=ROUND_HALF_UP)
