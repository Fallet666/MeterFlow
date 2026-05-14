FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_LINK_MODE=copy
ENV UV_PROJECT_ENVIRONMENT=/usr/local

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.7.14 /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock .python-version /app/
RUN uv sync --frozen --no-cache --no-install-project

COPY . /app

EXPOSE 8000

CMD ["sh", "-c", "uv run python manage.py migrate && uv run python manage.py seedtestdata && uv run python manage.py runserver 0.0.0.0:8000"]
