from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from core.models import Meter, Property, Tariff


@pytest.fixture
def user(db):
    return User.objects.create_user(username="alice", password="password123", email="alice@example.com")


@pytest.fixture
def admin_user(db):
    user = User.objects.create_user(username="admin", password="password123", is_staff=True)
    user.profile.role = "admin"
    user.profile.save()
    return user


@pytest.fixture
def employee_user(db):
    user = User.objects.create_user(username="employee", password="password123")
    user.profile.role = "employee"
    user.profile.save()
    return user


@pytest.fixture
def api_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def admin_api_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def property_obj(user):
    return Property.objects.create(owner=user, name="Дом", address="ул. Тестовая, 1")


@pytest.fixture
def meter(property_obj):
    return Meter.objects.create(
        property=property_obj,
        resource_type=Meter.ELECTRICITY,
        unit="kWh",
        serial_number="SN-001",
    )


@pytest.fixture
def tariff():
    return Tariff.objects.create(
        resource_type=Meter.ELECTRICITY,
        value_per_unit=Decimal("5.50"),
        valid_from=date(date.today().year, 1, 1),
    )
