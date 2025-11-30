import random
from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.models import Sum

from core.models import Meter, MonthlyCharge, Payment, Property, Reading, Tariff
from core.services import process_reading

User = get_user_model()


RESOURCE_UNIT_MAP = {
    Meter.ELECTRICITY: "кВт·ч",
    Meter.COLD_WATER: "м³",
    Meter.HOT_WATER: "м³",
    Meter.GAS: "м³",
    Meter.HEATING: "Гкал",
}


class Command(BaseCommand):
    help = "Создает тестовые данные с пользователем 'test' и реалистичной историей"

    def add_arguments(self, parser):
        parser.add_argument("--months", type=int, default=24, help="Глубина истории в месяцах")

    def handle(self, *args, **options):
        months = options["months"]
        user, _ = User.objects.get_or_create(username="test", defaults={"email": "test@example.com"})
        user.set_password("test1234")
        user.save()

        self.stdout.write(self.style.SUCCESS("Пользователь test готов"))

        properties = [
            {"name": "Квартира в центре", "address": "Москва, Цветной бульвар, 11"},
            {"name": "Загородный дом", "address": "Новая Рига, 24-й км"},
            {"name": "Дача у озера", "address": "Тверская область, оз. Волго"},
            {"name": "Офис-лофт", "address": "Санкт-Петербург, Наб. канала Грибоедова, 42"},
        ]

        property_objects = []
        for payload in properties:
            prop, _ = Property.objects.get_or_create(owner=user, name=payload["name"], defaults={"address": payload["address"]})
            prop.address = payload["address"]
            prop.save()
            property_objects.append(prop)

        tariffs = {
            Meter.ELECTRICITY: Decimal("6.90"),
            Meter.COLD_WATER: Decimal("45.10"),
            Meter.HOT_WATER: Decimal("210.50"),
            Meter.GAS: Decimal("7.40"),
            Meter.HEATING: Decimal("1820.00"),
        }

        tariff_start = date.today().replace(year=date.today().year - 2, month=1, day=1)
        for resource, value in tariffs.items():
            Tariff.objects.update_or_create(
                resource_type=resource,
                valid_from=tariff_start,
                defaults={"value_per_unit": value, "valid_to": None},
            )

        meter_sets = {
            Meter.ELECTRICITY: "EL",
            Meter.COLD_WATER: "CW",
            Meter.HOT_WATER: "HW",
            Meter.GAS: "GS",
            Meter.HEATING: "HT",
        }

        for prop in property_objects:
            meters = []
            for idx, (resource, prefix) in enumerate(meter_sets.items(), start=1):
                meter, _ = Meter.objects.get_or_create(
                    property=prop,
                    resource_type=resource,
                    defaults={
                        "unit": RESOURCE_UNIT_MAP[resource],
                        "serial_number": f"{prefix}-{prop.id:02d}{idx:03d}",
                        "installed_at": date.today() - timedelta(days=365),
                        "is_active": True,
                    },
                )
                meters.append(meter)

            for meter in meters:
                if meter.readings.exists():
                    continue
                self._seed_readings_for_meter(meter, months)

        self.stdout.write(self.style.SUCCESS("История показаний и начислений создана"))

        for prop in property_objects:
            self._ensure_payments(prop)

        self.stdout.write(self.style.SUCCESS("Платежи созданы"))

    def _monthly_usage(self, resource_type: str, month: int) -> Decimal:
        seasonal_multiplier = 1
        if resource_type in (Meter.GAS, Meter.HEATING):
            seasonal_multiplier = 1.4 if month in (12, 1, 2) else 0.7 if month in (6, 7, 8) else 1
        elif resource_type == Meter.ELECTRICITY:
            seasonal_multiplier = 1.15 if month in (12, 1, 2, 7, 8) else 0.95
        elif resource_type in (Meter.COLD_WATER, Meter.HOT_WATER):
            seasonal_multiplier = 1.2 if month in (6, 7, 8) else 1

        base = {
            Meter.ELECTRICITY: Decimal("120"),
            Meter.COLD_WATER: Decimal("5"),
            Meter.HOT_WATER: Decimal("3.5"),
            Meter.GAS: Decimal("38"),
            Meter.HEATING: Decimal("0.8"),
        }.get(resource_type, Decimal("10"))

        jitter = Decimal(str(random.uniform(-0.1, 0.12)))
        return (base * Decimal(str(seasonal_multiplier))) * (Decimal("1") + jitter)

    def _shift_month(self, year: int, month: int, delta: int) -> tuple[int, int]:
        new_month_index = month + delta - 1
        new_year = year + new_month_index // 12
        new_month = (new_month_index % 12) + 1
        return new_year, new_month

    def _seed_readings_for_meter(self, meter: Meter, months: int) -> None:
        today = date.today().replace(day=1)
        start_year, start_month = self._shift_month(today.year, today.month, -months)
        reading_value = Decimal(random.randint(10, 50))

        current_year = start_year
        current_month = start_month
        for _ in range(months):
            monthly_delta = self._monthly_usage(meter.resource_type, current_month)
            reading_value += monthly_delta
            last_day = monthrange(current_year, current_month)[1]
            reading_date = date(current_year, current_month, last_day)
            reading = Reading.objects.create(
                meter=meter,
                value=reading_value.quantize(Decimal("0.001")),
                reading_date=reading_date,
            )
            process_reading(reading)

            current_year, current_month = self._shift_month(current_year, current_month, 1)

    def _ensure_payments(self, property_obj: Property) -> None:
        charges = (
            MonthlyCharge.objects.filter(property=property_obj)
            .values("year", "month")
            .annotate(total_amount=Sum("amount"))
        )
        for charge in charges:
            payment_date = date(charge["year"], charge["month"], 10)
            Payment.objects.get_or_create(
                property=property_obj,
                year=charge["year"],
                month=charge["month"],
                defaults={
                    "amount": Decimal(charge["total_amount"]) * Decimal("0.95"),
                    "paid_at": payment_date,
                    "comment": "Автоматический платёж тестовых данных",
                },
            )
