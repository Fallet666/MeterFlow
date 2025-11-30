from datetime import date
from decimal import Decimal
from typing import Optional

from django.db import transaction
from django.db.models import Q, Sum

from .models import Meter, MonthlyCharge, Property, Reading, Tariff


def get_previous_reading(meter: Meter, reading_date: date) -> Optional[Reading]:
    return (
        meter.readings.filter(reading_date__lt=reading_date)
        .order_by("-reading_date", "-created_at")
        .first()
    )


def find_tariff(resource_type: str, target_date: date) -> Optional[Tariff]:
    return (
        Tariff.objects.filter(
            resource_type=resource_type,
            valid_from__lte=target_date,
        )
        .filter(Q(valid_to__isnull=True) | Q(valid_to__gte=target_date))
        .order_by("-valid_from")
        .first()
    )


@transaction.atomic
def process_reading(reading: Reading) -> None:
    previous = get_previous_reading(reading.meter, reading.reading_date)
    delta = Decimal("0")
    if previous:
        delta = reading.value - previous.value
        if delta < 0:
            delta = Decimal("0")

    tariff = find_tariff(reading.meter.resource_type, reading.reading_date)
    if tariff is None or delta <= 0:
        return

    year = reading.reading_date.year
    month = reading.reading_date.month

    charge, _ = MonthlyCharge.objects.get_or_create(
        property=reading.meter.property,
        year=year,
        month=month,
        resource_type=reading.meter.resource_type,
        defaults={"consumption": Decimal("0"), "amount": Decimal("0")},
    )

    charge.consumption += delta
    charge.amount += delta * tariff.value_per_unit
    charge.save()


def forecast_property(property_obj: Property, months: int = 3) -> Decimal:
    today = date.today()
    # exclude current month
    charges = (
        MonthlyCharge.objects.filter(property=property_obj)
        .exclude(year=today.year, month=today.month)
        .values("year", "month")
        .annotate(total_amount=Sum("amount"))
        .order_by("-year", "-month")
    )
    totals = [c["total_amount"] for c in charges[:months]]
    if not totals:
        return Decimal("0")
    return sum(totals) / len(totals)
