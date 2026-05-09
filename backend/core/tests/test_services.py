from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User

from core.models import Meter, MonthlyCharge, Property, Reading, Tariff
from core.services import ensure_demo_data, forecast_property, process_reading


@pytest.mark.django_db
def test_process_reading_ignores_negative_delta(meter, tariff):
    first = Reading.objects.create(
        meter=meter,
        value=Decimal("250.000"),
        reading_date=date.today().replace(day=1),
    )
    second = Reading.objects.create(
        meter=meter,
        value=Decimal("100.000"),
        reading_date=first.reading_date + timedelta(days=30),
    )

    process_reading(second)

    assert MonthlyCharge.objects.count() == 0


@pytest.mark.django_db
def test_forecast_property_averages_previous_months(property_obj):
    today = date.today()
    base_year = today.year - 1
    amounts = [Decimal("120.00"), Decimal("150.00"), Decimal("180.00")]
    for idx, amount in enumerate(amounts):
        MonthlyCharge.objects.create(
            property=property_obj,
            year=base_year,
            month=10 + idx,
            resource_type=Meter.ELECTRICITY,
            consumption=Decimal("10.0"),
            amount=amount,
        )

    MonthlyCharge.objects.create(
        property=property_obj,
        year=today.year,
        month=today.month,
        resource_type=Meter.ELECTRICITY,
        consumption=Decimal("10.0"),
        amount=Decimal("999.00"),
    )

    result = forecast_property(property_obj, months=2)
    assert result == Decimal("165.00")


@pytest.mark.django_db
def test_ensure_demo_data_only_for_test_user_and_is_idempotent():
    regular = User.objects.create_user(username="regular", password="password123")
    ensure_demo_data(regular)
    assert Property.objects.filter(owner=regular).count() == 0

    test_user = User.objects.create_user(username="test", password="password123")
    ensure_demo_data(test_user)
    ensure_demo_data(test_user)

    demo_property = Property.objects.get(owner=test_user)
    assert demo_property.meters.count() == 3
    assert Reading.objects.filter(meter__property=demo_property).count() == 7
    assert Tariff.objects.count() == 5
    assert MonthlyCharge.objects.filter(property=demo_property).exists()
