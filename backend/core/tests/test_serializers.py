from datetime import date
from decimal import Decimal

import pytest
from rest_framework.test import APIRequestFactory

from core.models import Meter, Reading
from core.serializers import MeterSerializer, PropertySerializer, ReadingSerializer
from core.services import get_previous_reading


@pytest.mark.django_db
def test_property_serializer_sets_owner(user):
    factory = APIRequestFactory()
    request = factory.post("/api/properties/")
    request.user = user

    serializer = PropertySerializer(data={"name": "Квартира", "address": "ул. Новая"}, context={"request": request})
    assert serializer.is_valid(), serializer.errors

    prop = serializer.save()
    assert prop.owner == user


@pytest.mark.django_db
def test_meter_serializer_validates_owner(user):
    other = user.__class__.objects.create_user(username="bob", password="pass123")
    property_other = other.properties.create(name="Чужая", address="Не ваша")
    factory = APIRequestFactory()
    request = factory.post("/api/meters/")
    request.user = user

    serializer = MeterSerializer(
        data={"property": property_other.id, "resource_type": Meter.ELECTRICITY, "unit": "kWh"},
        context={"request": request},
    )

    assert not serializer.is_valid()
    assert "чужой" in serializer.errors["property"][0]


@pytest.mark.django_db
def test_reading_serializer_returns_delta_and_amount(meter, tariff):
    factory = APIRequestFactory()
    request = factory.post("/api/readings/")
    request.user = meter.property.owner

    first = Reading.objects.create(
        meter=meter,
        value=Decimal("100.000"),
        reading_date=date.today().replace(day=1),
    )

    serializer = ReadingSerializer(
        data={"meter": meter.id, "value": "110.000", "reading_date": date.today().isoformat()},
        context={"request": request},
    )
    assert serializer.is_valid(), serializer.errors

    instance = serializer.save()

    serialized = ReadingSerializer(instance)
    assert serialized.data["consumption_delta"] == 10.0
    assert serialized.data["amount_value"] == pytest.approx(55.0)
    assert get_previous_reading(meter, instance.reading_date) == first
