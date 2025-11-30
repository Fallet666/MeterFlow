from datetime import date

from django.contrib.auth.models import User
from django.db.models import Q, Sum
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Meter, MonthlyCharge, Payment, Property, Reading, Tariff
from .serializers import (
    LoginSerializer,
    MeterSerializer,
    MonthlyChargeSerializer,
    PaymentSerializer,
    PropertySerializer,
    ReadingSerializer,
    TariffSerializer,
    UserSerializer,
)
from .services import ensure_demo_data, forecast_property


class RegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        user = self.object
        refresh = RefreshToken.for_user(user)
        response.data = {
            "user": UserSerializer(user).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
        return response

    def perform_create(self, serializer):
        self.object = serializer.save()
        ensure_demo_data(self.object)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer


class PropertyViewSet(viewsets.ModelViewSet):
    serializer_class = PropertySerializer

    def get_queryset(self):
        return Property.objects.filter(owner=self.request.user)


class MeterViewSet(viewsets.ModelViewSet):
    serializer_class = MeterSerializer

    def get_queryset(self):
        return Meter.objects.filter(property__owner=self.request.user)


class TariffViewSet(viewsets.ModelViewSet):
    queryset = Tariff.objects.all()
    serializer_class = TariffSerializer


class ReadingViewSet(viewsets.ModelViewSet):
    serializer_class = ReadingSerializer

    def get_queryset(self):
        return Reading.objects.filter(meter__property__owner=self.request.user)


class MonthlyChargeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MonthlyChargeSerializer

    def get_queryset(self):
        qs = MonthlyCharge.objects.filter(property__owner=self.request.user)
        property_id = self.request.query_params.get("property")
        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        if property_id:
            qs = qs.filter(property_id=property_id)
        if year:
            qs = qs.filter(year=year)
        if month:
            qs = qs.filter(month=month)
        return qs.order_by("year", "month")


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        return Payment.objects.filter(property__owner=self.request.user)


class AnalyticsViewSet(viewsets.ViewSet):
    def list(self, request):
        property_id = request.query_params.get("property")
        if not property_id:
            return Response({"detail": "property param required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            prop = Property.objects.get(id=property_id, owner=request.user)
        except Property.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        start_year = int(request.query_params.get("start_year", date.today().year - 1))
        start_month = int(request.query_params.get("start_month", 1))
        end_year = int(request.query_params.get("end_year", date.today().year))
        end_month = int(request.query_params.get("end_month", 12))

        charges = (
            MonthlyCharge.objects.filter(property=prop)
            .filter(
                (Q(year__gt=start_year) | Q(year=start_year, month__gte=start_month))
            )
            .filter(Q(year__lt=end_year) | Q(year=end_year, month__lte=end_month))
        )

        data = {}
        for charge in charges.order_by("year", "month"):
            key = f"{charge.year}-{charge.month:02d}"
            data.setdefault(key, {"month": key, "items": [], "total_amount": 0, "total_consumption": 0})
            data[key]["items"].append(
                {
                    "resource_type": charge.resource_type,
                    "consumption": float(charge.consumption),
                    "amount": float(charge.amount),
                }
            )
            data[key]["total_amount"] += float(charge.amount)
            data[key]["total_consumption"] += float(charge.consumption)

        payment_summary = (
            Payment.objects.filter(property=prop)
            .values("year", "month")
            .annotate(total=Sum("amount"))
        )

        forecast = float(forecast_property(prop))

        return Response(
            {
                "period": {"start_year": start_year, "start_month": start_month, "end_year": end_year, "end_month": end_month},
                "monthly": list(data.values()),
                "payments": list(payment_summary),
                "forecast_amount": forecast,
            }
        )

    @action(detail=False, methods=["get"])
    def forecast(self, request):
        property_id = request.query_params.get("property")
        if not property_id:
            return Response({"detail": "property param required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            prop = Property.objects.get(id=property_id, owner=request.user)
        except Property.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        forecast_value = float(forecast_property(prop))
        return Response({"forecast_amount": forecast_value})
