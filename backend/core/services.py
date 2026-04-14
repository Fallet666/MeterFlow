from datetime import date, timedelta
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
    rebuild_monthly_charges(reading.meter.property, reading.meter.resource_type)


@transaction.atomic
def rebuild_monthly_charges(property_obj: Property, resource_type: str) -> None:
    MonthlyCharge.objects.filter(property=property_obj, resource_type=resource_type).delete()

    meters = Meter.objects.filter(property=property_obj, resource_type=resource_type)
    for meter in meters:
        previous = None
        readings = meter.readings.order_by("reading_date", "created_at", "id")
        for reading in readings:
            if previous is None:
                previous = reading
                continue

            delta = reading.value - previous.value
            previous = reading
            if delta <= 0:
                continue

            tariff = find_tariff(resource_type, reading.reading_date)
            if tariff is None:
                continue

            charge, _ = MonthlyCharge.objects.get_or_create(
                property=property_obj,
                year=reading.reading_date.year,
                month=reading.reading_date.month,
                resource_type=resource_type,
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


def ensure_demo_data(user) -> None:
    """Create demo data for the test user to simplify onboarding."""

    if user.username != "test":
        return

    if Property.objects.filter(owner=user).exists():
        return

    home = Property.objects.create(
        owner=user,
        name="Демо-квартира",
        address="Москва, Петровка, 38",
    )

    tariff_values = {
        Meter.ELECTRICITY: Decimal("6.80"),
        Meter.COLD_WATER: Decimal("45.10"),
        Meter.HOT_WATER: Decimal("210.50"),
        Meter.GAS: Decimal("7.20"),
        Meter.HEATING: Decimal("1800"),
    }

    for resource, value in tariff_values.items():
        Tariff.objects.get_or_create(
            resource_type=resource,
            valid_from=date(date.today().year - 1, 1, 1),
            defaults={"value_per_unit": value},
        )

    meter_map = {}
    for resource, serial, unit in [
        (Meter.ELECTRICITY, "EL-001245", "kWh"),
        (Meter.COLD_WATER, "CW-55421", "м³"),
        (Meter.HOT_WATER, "HW-12002", "м³"),
    ]:
        meter, _ = Meter.objects.get_or_create(
            property=home,
            resource_type=resource,
            defaults={"serial_number": serial, "unit": unit},
        )
        meter_map[resource] = meter

    if Reading.objects.filter(meter__property=home).exists():
        return

    history = [
        (Meter.ELECTRICITY, Decimal("1240"), date.today().replace(day=1) - timedelta(days=90)),
        (Meter.ELECTRICITY, Decimal("1312"), date.today().replace(day=1) - timedelta(days=60)),
        (Meter.ELECTRICITY, Decimal("1394"), date.today().replace(day=1) - timedelta(days=30)),
        (Meter.COLD_WATER, Decimal("15.2"), date.today().replace(day=1) - timedelta(days=45)),
        (Meter.COLD_WATER, Decimal("17.8"), date.today().replace(day=1) - timedelta(days=15)),
        (Meter.HOT_WATER, Decimal("9.5"), date.today().replace(day=1) - timedelta(days=45)),
        (Meter.HOT_WATER, Decimal("11.1"), date.today().replace(day=1) - timedelta(days=15)),
    ]

    for resource, value, reading_date in history:
        meter = meter_map.get(resource)
        if not meter:
            continue
        reading = Reading.objects.create(meter=meter, value=value, reading_date=reading_date)
        process_reading(reading)
