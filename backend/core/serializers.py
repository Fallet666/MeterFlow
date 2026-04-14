from decimal import Decimal

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Meter, MonthlyCharge, Payment, Property, Reading, Tariff
from .services import ensure_demo_data, find_tariff, get_previous_reading, process_reading


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "password", "email"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        return user

    def validate_password(self, value):
        validate_password(value)
        return value


class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = ["id", "name", "address", "created_at"]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        user = self.context["request"].user
        return Property.objects.create(owner=user, **validated_data)


class MeterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meter
        fields = [
            "id",
            "property",
            "resource_type",
            "unit",
            "serial_number",
            "installed_at",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate_property(self, value):
        request = self.context["request"]
        if value.owner != request.user:
            raise serializers.ValidationError("Нельзя добавлять счетчики к чужой собственности")
        return value


class TariffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tariff
        fields = ["id", "resource_type", "value_per_unit", "valid_from", "valid_to"]

    def validate_value_per_unit(self, value):
        if value < 0:
            raise serializers.ValidationError("Тариф не может быть отрицательным")
        return value

    def validate(self, attrs):
        valid_from = attrs.get("valid_from", getattr(self.instance, "valid_from", None))
        valid_to = attrs.get("valid_to", getattr(self.instance, "valid_to", None))
        if valid_from and valid_to and valid_to < valid_from:
            raise serializers.ValidationError("Дата окончания тарифа не может быть раньше даты начала")
        return attrs


class ReadingSerializer(serializers.ModelSerializer):
    meter_detail = MeterSerializer(source="meter", read_only=True)
    resource_label = serializers.SerializerMethodField()
    unit = serializers.SerializerMethodField()
    consumption_delta = serializers.SerializerMethodField()
    amount_value = serializers.SerializerMethodField()

    class Meta:
        model = Reading
        fields = [
            "id",
            "meter",
            "value",
            "reading_date",
            "created_at",
            "meter_detail",
            "resource_label",
            "unit",
            "consumption_delta",
            "amount_value",
        ]
        read_only_fields = ["id", "created_at", "consumption_delta", "amount_value", "resource_label", "unit"]

    def validate_meter(self, value):
        request = self.context["request"]
        if value.property.owner != request.user:
            raise serializers.ValidationError("Нельзя добавлять показания к чужому счетчику")
        return value

    def validate_value(self, value):
        if value < 0:
            raise serializers.ValidationError("Показание не может быть отрицательным")
        return value

    def create(self, validated_data):
        reading = super().create(validated_data)
        process_reading(reading)
        return reading

    def get_unit(self, obj):
        return obj.meter.unit

    def get_resource_label(self, obj):
        return obj.meter.get_resource_type_display()

    def get_consumption_delta(self, obj):
        previous = get_previous_reading(obj.meter, obj.reading_date)
        if not previous:
            return None
        delta = obj.value - previous.value
        if delta <= 0:
            return None
        return float(delta)

    def get_amount_value(self, obj):
        delta = self.get_consumption_delta(obj)
        if delta is None:
            return None
        tariff = find_tariff(obj.meter.resource_type, obj.reading_date)
        if not tariff:
            return None
        return float(tariff.value_per_unit * Decimal(str(delta)))


class MonthlyChargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyCharge
        fields = [
            "id",
            "property",
            "year",
            "month",
            "resource_type",
            "consumption",
            "amount",
            "generated_at",
        ]
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "property", "year", "month", "amount", "paid_at", "comment", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_property(self, value):
        request = self.context["request"]
        if value.owner != request.user:
            raise serializers.ValidationError("Нельзя добавлять платежи к чужой собственности")
        return value

    def validate_month(self, value):
        if value < 1 or value > 12:
            raise serializers.ValidationError("Месяц должен быть в диапазоне от 1 до 12")
        return value

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Платеж не может быть отрицательным")
        return value


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        ensure_demo_data(self.user)
        return data
