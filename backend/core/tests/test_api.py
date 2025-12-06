from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from core.models import Meter, MonthlyCharge, Payment, Property, Reading, Tariff


@pytest.mark.django_db
def test_registration_returns_tokens(client=None):
    client = APIClient()
    response = client.post(
        "/api/auth/register/",
        {"username": "newuser", "password": "pass12345", "email": "new@example.com"},
        format="json",
    )
    assert response.status_code == 201
    assert {"access", "refresh", "user"}.issubset(response.data.keys())


@pytest.mark.django_db
def test_login_returns_tokens(user):
    client = APIClient()
    response = client.post(
        "/api/auth/login/",
        {"username": user.username, "password": "password123"},
        format="json",
    )
    assert response.status_code == 200
    assert "access" in response.data and "refresh" in response.data


@pytest.mark.django_db
def test_property_crud_filtered_by_user(api_client, user):
    own = Property.objects.create(owner=user, name="Мой дом", address="Адрес")
    stranger = User.objects.create_user(username="other", password="pass123")
    Property.objects.create(owner=stranger, name="Чужой", address="Адрес")

    response = api_client.get("/api/properties/")
    assert response.status_code == 200
    assert [p["id"] for p in response.data] == [own.id]


@pytest.mark.django_db
def test_meter_creation_validates_owner(api_client, property_obj):
    stranger = User.objects.create_user(username="other", password="pass123")
    foreign_property = Property.objects.create(owner=stranger, name="Чужая", address="Не ваша")

    response = api_client.post(
        "/api/meters/",
        {"property": foreign_property.id, "resource_type": Meter.ELECTRICITY, "unit": "kWh"},
        format="json",
    )
    assert response.status_code == 400
    assert "чужой" in response.data["property"][0]


@pytest.mark.django_db
def test_reading_creation_updates_monthly_charge(api_client, meter, tariff):
    Reading.objects.create(
        meter=meter,
        value=Decimal("10.000"),
        reading_date=date.today().replace(day=1) - timedelta(days=30),
    )

    response = api_client.post(
        "/api/readings/",
        {
            "meter": meter.id,
            "value": "15.500",
            "reading_date": date.today().isoformat(),
        },
        format="json",
    )
    assert response.status_code == 201

    charge = MonthlyCharge.objects.get(property=meter.property)
    assert float(charge.consumption) == pytest.approx(5.5)
    assert float(charge.amount) == pytest.approx(30.25)


@pytest.mark.django_db
def test_payment_validation(api_client, property_obj):
    other = User.objects.create_user(username="someone", password="pass123")
    foreign = Property.objects.create(owner=other, name="Чужая", address="Не ваша")

    response = api_client.post(
        "/api/payments/",
        {
            "property": foreign.id,
            "year": 2024,
            "month": 1,
            "amount": "1000.00",
            "paid_at": "2024-01-01",
        },
        format="json",
    )
    assert response.status_code == 400

    ok = api_client.post(
        "/api/payments/",
        {
            "property": property_obj.id,
            "year": 2024,
            "month": 1,
            "amount": "1000.00",
            "paid_at": "2024-01-01",
        },
        format="json",
    )
    assert ok.status_code == 201


@pytest.mark.django_db
def test_tariff_crud(api_client):
    response = api_client.post(
        "/api/tariffs/",
        {
            "resource_type": Meter.COLD_WATER,
            "value_per_unit": "35.10",
            "valid_from": "2024-01-01",
        },
        format="json",
    )
    assert response.status_code == 201
    list_resp = api_client.get("/api/tariffs/")
    assert any(item["resource_type"] == Meter.COLD_WATER for item in list_resp.data)


@pytest.mark.django_db
def test_analytics_returns_summary(api_client, property_obj, meter, tariff):
    today = date.today()
    Reading.objects.create(meter=meter, value=Decimal("10.0"), reading_date=today.replace(day=1) - timedelta(days=30))
    Reading.objects.create(meter=meter, value=Decimal("20.0"), reading_date=today.replace(day=1))

    api_client.post(
        "/api/readings/",
        {
            "meter": meter.id,
            "value": "25.000",
            "reading_date": today.isoformat(),
        },
        format="json",
    )

    Payment.objects.create(property=property_obj, year=today.year, month=today.month, amount=Decimal("1500"), paid_at=today)

    response = api_client.get(
        "/api/analytics/",
        {
            "property": property_obj.id,
            "start_year": today.year - 1,
            "start_month": 1,
            "end_year": today.year,
            "end_month": 12,
        },
    )
    assert response.status_code == 200
    data = response.data
    assert data["summary"]["total_amount"] >= 0
    assert data["monthly"], "Monthly data should be present"
    assert data["comparison"], "Comparison per property should be present"
    assert data["forecast_amount"] >= 0
    assert any(item["resource_type"] == Meter.ELECTRICITY for item in data["summary"]["resources"])


@pytest.mark.django_db
def test_analytics_handles_no_properties_gracefully(user):
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get("/api/analytics/")
    assert response.status_code == 200
    assert response.data["forecast_amount"] == 0
    assert response.data["monthly"] == []


@pytest.mark.django_db
def test_monthly_charges_endpoint_filters_by_owner(api_client, property_obj):
    other = User.objects.create_user(username="outsider", password="pass123")
    foreign_property = Property.objects.create(owner=other, name="Чужой", address="Нет доступа")
    mine = MonthlyCharge.objects.create(
        property=property_obj,
        year=2024,
        month=5,
        resource_type=Meter.ELECTRICITY,
        consumption=Decimal("10.0"),
        amount=Decimal("100.00"),
    )
    MonthlyCharge.objects.create(
        property=foreign_property,
        year=2024,
        month=5,
        resource_type=Meter.ELECTRICITY,
        consumption=Decimal("20.0"),
        amount=Decimal("200.00"),
    )

    response = api_client.get("/api/monthly-charges/")
    assert response.status_code == 200
    assert [item["id"] for item in response.data] == [mine.id]

    filtered = api_client.get("/api/monthly-charges/", {"property": property_obj.id})
    assert filtered.status_code == 200
    assert len(filtered.data) == 1
    assert filtered.data[0]["property"] == property_obj.id
