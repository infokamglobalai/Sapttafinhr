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


_ONES = (
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen",
)
_TENS = ("", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety")


def _int_to_words(n: int) -> str:
    if n < 0:
        return f"minus {_int_to_words(-n)}"
    if n < 20:
        return _ONES[n]
    if n < 100:
        tens, rem = divmod(n, 10)
        return _TENS[tens] if rem == 0 else f"{_TENS[tens]} {_ONES[rem]}"
    if n < 1000:
        hundreds, rem = divmod(n, 100)
        head = f"{_ONES[hundreds]} hundred"
        return head if rem == 0 else f"{head} {_int_to_words(rem)}"
    if n < 1_000_000:
        thousands, rem = divmod(n, 1000)
        head = f"{_int_to_words(thousands)} thousand"
        return head if rem == 0 else f"{head} {_int_to_words(rem)}"
    millions, rem = divmod(n, 1_000_000)
    head = f"{_int_to_words(millions)} million"
    return head if rem == 0 else f"{head} {_int_to_words(rem)}"


def amount_in_words(amount, currency: str | None = "INR") -> str:
    """English amount in words for payslip footers (GCC / India)."""
    code = (currency or "INR").strip().upper()
    val = round_money(amount, code)
    places = currency_decimal_places(code)
    units = int(val)
    words = _int_to_words(units).upper()
    prefix = CURRENCY_SYMBOLS.get(code, f"{code} ").strip().upper()
    if code == "INR":
        prefix = "RUPEES"
    if places == 3:
        frac = int((val - Decimal(units)) * 1000)
        if frac:
            return f"{prefix} {words} AND {frac}/1000 ONLY"
    elif places == 2:
        frac = int((val - Decimal(units)) * 100)
        if frac:
            return f"{prefix} {words} AND {frac}/100 ONLY"
    return f"{prefix} {words} ONLY"


def format_amount_plain(amount, currency: str | None = "INR") -> str:
    """Whole-number amount for India payslip tables (no symbol/decimals)."""
    code = (currency or "INR").strip().upper()
    val = int(round_money(amount, code))
    if code == "INR":
        return str(val)
    return format_money(amount, code, symbol=False)


def amount_in_words_parenthetical(amount, currency: str | None = "INR") -> str:
    return f"({amount_in_words(amount, currency)})"


def amount_in_words_india_parenthetical(amount) -> str:
    """Indian payslip style: (SIXTY NINE THOUSAND EIGHT HUNDRED RUPEES ONLY)."""
    val = round_money(amount, "INR")
    units = int(val)
    words = _int_to_words(units).upper()
    return f"({words} RUPEES ONLY)"
