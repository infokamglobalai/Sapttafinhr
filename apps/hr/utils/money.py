"""Currency-aware money rounding and formatting for payroll."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

# ISO 4217 minor units — GCC currencies with 3 decimal places (fils/baisa).
CURRENCY_DECIMALS: dict[str, int] = {
    "KWD": 3,
    "BHD": 3,
    "OMR": 3,
    "JOD": 3,
    "TND": 3,
    "INR": 2,
    "AED": 2,
    "SAR": 2,
    "QAR": 2,
    "USD": 2,
    "EUR": 2,
}

CURRENCY_SYMBOLS: dict[str, str] = {
    "INR": "₹",
    "KWD": "KD ",
    "AED": "AED ",
    "SAR": "SAR ",
    "BHD": "BHD ",
    "OMR": "OMR ",
    "QAR": "QAR ",
    "USD": "$",
}


def currency_decimal_places(currency: str | None) -> int:
    code = (currency or "INR").strip().upper()
    return CURRENCY_DECIMALS.get(code, 2)


def money_quantum(currency: str | None) -> Decimal:
    places = currency_decimal_places(currency)
    if places == 3:
        return Decimal("0.001")
    return Decimal("0.01")


def round_money(value, currency: str | None = "INR") -> Decimal:
    """Round to the correct minor units for the tenant currency."""
    quantum = money_quantum(currency)
    return Decimal(str(value or 0)).quantize(quantum, rounding=ROUND_HALF_UP)


def format_money(amount, currency: str | None = "INR", *, symbol: bool = True) -> str:
    """Human-readable amount with correct decimal places."""
    code = (currency or "INR").strip().upper()
    places = currency_decimal_places(code)
    val = round_money(amount, code)
    prefix = CURRENCY_SYMBOLS.get(code, f"{code} ") if symbol else ""
    return f"{prefix}{val:,.{places}f}"
