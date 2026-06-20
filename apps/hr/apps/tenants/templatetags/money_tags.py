from django import template

from utils.money import currency_decimal_places, format_money

register = template.Library()


@register.filter
def money_format(amount, currency="INR"):
    return format_money(amount, currency)


@register.filter
def currency_decimals(currency):
    return currency_decimal_places(currency)


@register.filter
def floatformat_currency(amount, currency="INR"):
    places = currency_decimal_places(currency)
    try:
        return f"{float(amount):,.{places}f}"
    except (TypeError, ValueError):
        return amount
