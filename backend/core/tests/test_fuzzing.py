from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from hypothesis import HealthCheck, given, settings, strategies as st
from rest_framework.test import APIClient

from core.models import Meter, MonthlyCharge, Property, Reading, Tariff
from core.services import process_reading


reading_points = st.lists(
    st.tuples(
        st.integers(min_value=0, max_value=365),
        st.decimals(min_value=Decimal("0.00"), max_value=Decimal("10000.00"), places=2),
    ),
    min_size=1,
    max_size=18,
    unique_by=lambda item: item[0],
)


@pytest.mark.django_db(transaction=True)
@settings(max_examples=25, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(points=reading_points)
def test_fuzz_reading_charges_match_chronological_positive_deltas(points):
    User.objects.all().delete()
    user = User.objects.create_user(username="fuzz_user", password="password123")
    property_obj = Property.objects.create(owner=user, name="Fuzz home", address="Fuzz street")
    meter = Meter.objects.create(
        property=property_obj,
        resource_type=Meter.ELECTRICITY,
        unit="kWh",
        serial_number="FUZZ-001",
    )
    Tariff.objects.create(
        resource_type=Meter.ELECTRICITY,
        value_per_unit=Decimal("1.00"),
        valid_from=date(2023, 1, 1),
    )

    start = date(2024, 1, 1)
    for day_offset, value in points:
        reading = Reading.objects.create(
            meter=meter,
            value=value,
            reading_date=start + timedelta(days=day_offset),
        )
        process_reading(reading)

    expected = defaultdict(lambda: Decimal("0.00"))
    ordered_points = sorted(points, key=lambda item: item[0])
    for (previous_day, previous_value), (current_day, current_value) in zip(ordered_points, ordered_points[1:]):
        delta = current_value - previous_value
        if delta <= 0:
            continue
        current_date = start + timedelta(days=current_day)
        expected[(current_date.year, current_date.month)] += delta

    charges = {
        (charge.year, charge.month): charge
        for charge in MonthlyCharge.objects.filter(property=property_obj, resource_type=Meter.ELECTRICITY)
    }

    assert set(charges) == set(expected)
    for key, consumption in expected.items():
        assert charges[key].consumption == consumption
        assert charges[key].amount == consumption


@pytest.mark.django_db
def test_reading_update_and_delete_rebuild_monthly_charges(api_client, meter, tariff):
    tariff.valid_from = date(2023, 1, 1)
    tariff.save()
    first = api_client.post(
        "/api/readings/",
        {"meter": meter.id, "value": "10.000", "reading_date": "2024-01-01"},
        format="json",
    )
    assert first.status_code == 201
    second = api_client.post(
        "/api/readings/",
        {"meter": meter.id, "value": "20.000", "reading_date": "2024-02-01"},
        format="json",
    )
    assert second.status_code == 201

    charge = MonthlyCharge.objects.get(property=meter.property, year=2024, month=2)
    assert charge.consumption == Decimal("10.000")
    assert charge.amount == Decimal("55.00")

    updated = api_client.patch(
        f"/api/readings/{first.data['id']}/",
        {"value": "15.000"},
        format="json",
    )
    assert updated.status_code == 200
    charge = MonthlyCharge.objects.get(property=meter.property, year=2024, month=2)
    assert charge.consumption == Decimal("5.000")
    assert charge.amount == Decimal("27.50")

    deleted = api_client.delete(f"/api/readings/{first.data['id']}/")
    assert deleted.status_code == 204
    assert MonthlyCharge.objects.filter(property=meter.property).count() == 0


fuzz_text = st.text(
    alphabet=st.characters(min_codepoint=32, max_codepoint=126),
    max_size=24,
)


@pytest.mark.django_db(transaction=True)
@settings(max_examples=40, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(
    params=st.fixed_dictionaries(
        {
            "property": fuzz_text,
            "properties": fuzz_text,
            "start_year": fuzz_text,
            "start_month": fuzz_text,
            "end_year": fuzz_text,
            "end_month": fuzz_text,
        }
    )
)
def test_fuzz_analytics_query_params_never_crash(params):
    User.objects.all().delete()
    user = User.objects.create_user(username="analytics_fuzz", password="password123")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/analytics/", params)

    assert response.status_code < 500
    assert response.status_code in {200, 400}


@pytest.mark.django_db(transaction=True)
@settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(
    invalid_month=st.one_of(st.integers(max_value=0), st.integers(min_value=13, max_value=10_000)),
    negative_amount=st.decimals(max_value=Decimal("-0.01"), min_value=Decimal("-10000.00"), places=2),
    negative_reading=st.decimals(max_value=Decimal("-0.001"), min_value=Decimal("-10000.000"), places=3),
)
def test_fuzz_domain_validation_rejects_invalid_financial_payloads(
    invalid_month,
    negative_amount,
    negative_reading,
):
    User.objects.all().delete()
    user = User.objects.create_user(username="domain_fuzz", password="password123")
    property_obj = Property.objects.create(owner=user, name="Fuzz home", address="Fuzz street")
    meter = Meter.objects.create(
        property=property_obj,
        resource_type=Meter.ELECTRICITY,
        unit="kWh",
        serial_number="FUZZ-002",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    admin_user = User.objects.create_user(username="admin_fuzz", password="password123")
    admin_user.profile.role = "admin"
    admin_user.profile.save()
    admin_client = APIClient()
    admin_client.force_authenticate(user=admin_user)

    bad_payment_month = client.post(
        "/api/payments/",
        {
            "property": property_obj.id,
            "year": 2024,
            "month": invalid_month,
            "amount": "1.00",
            "paid_at": "2024-01-01",
        },
        format="json",
    )
    bad_payment_amount = client.post(
        "/api/payments/",
        {
            "property": property_obj.id,
            "year": 2024,
            "month": 1,
            "amount": str(negative_amount),
            "paid_at": "2024-01-01",
        },
        format="json",
    )
    bad_reading = client.post(
        "/api/readings/",
        {"meter": meter.id, "value": str(negative_reading), "reading_date": "2024-01-01"},
        format="json",
    )
    bad_tariff = admin_client.post(
        "/api/tariffs/",
        {
            "resource_type": Meter.ELECTRICITY,
            "value_per_unit": str(negative_amount),
            "valid_from": "2024-01-01",
        },
        format="json",
    )

    assert bad_payment_month.status_code == 400
    assert bad_payment_amount.status_code == 400
    assert bad_reading.status_code == 400
    assert bad_tariff.status_code == 400
