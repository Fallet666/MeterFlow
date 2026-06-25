import pytest
from django.conf import settings


@pytest.mark.django_db
def test_settings_secret_key_is_configured():
    assert settings.SECRET_KEY, "SECRET_KEY must be set"
