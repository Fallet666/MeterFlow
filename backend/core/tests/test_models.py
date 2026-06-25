from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User

from core.models import Meter, MonthlyCharge, Profile, Reading
from core.services import find_tariff, process_reading


@pytest.mark.django_db
def test_property_and_meter_str(property_obj, meter):
    assert str(property_obj) == f"{property_obj.name} ({property_obj.address})"
    assert meter.get_resource_type_display() in str(meter)


@pytest.mark.django_db
def test_find_tariff_returns_latest_matching(tariff):
    newer = tariff
    older = tariff.__class__.objects.create(
        resource_type=Meter.ELECTRICITY,
        value_per_unit=Decimal("4.50"),
        valid_from=date(tariff.valid_from.year - 1, 1, 1),
        valid_to=date(tariff.valid_from.year - 1, 12, 31),
    )

    target = find_tariff(Meter.ELECTRICITY, tariff.valid_from)
    assert target == newer
    assert find_tariff(Meter.ELECTRICITY, older.valid_from) == older


@pytest.mark.django_db
def test_process_reading_creates_monthly_charge(meter, tariff):
    Reading.objects.create(
        meter=meter,
        value=Decimal("2.000"),
        reading_date=date.today().replace(day=1) - timedelta(days=30),
    )
    reading = Reading.objects.create(
        meter=meter,
        value=Decimal("10.000"),
        reading_date=date.today().replace(day=1),
    )

    process_reading(reading)

    charge = MonthlyCharge.objects.get(property=meter.property)
    assert charge.consumption == Decimal("8.000")
    assert charge.amount == Decimal("44.00")


@pytest.mark.django_db
def test_profile_auto_created_on_user_creation():
    user = User.objects.create_user(username="profi", password="pass123")
    assert hasattr(user, "profile")
    assert user.profile.role == Profile.ROLE_USER


@pytest.mark.django_db
def test_profile_role_can_be_promoted(user):
    user.profile.role = Profile.ROLE_ADMIN
    user.profile.save()
    assert user.profile.role == Profile.ROLE_ADMIN
