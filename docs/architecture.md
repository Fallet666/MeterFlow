# Architecture

MeterFlow is a small but production-oriented utility metering system. The design favors explicit ownership boundaries, deterministic billing recalculation, and reproducible local/CI execution.

## System View

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React, Vite, React Router, Recharts | Authenticated SPA, forms, analytics charts, resilient rendering |
| API | Django, Django REST Framework, SimpleJWT | Authentication, CRUD, analytics aggregation, billing endpoints |
| Persistence | PostgreSQL in Docker, SQLite locally by default | Durable entities, readings, charges, payments, tariffs |
| Tooling | uv, npm, Docker Compose, GitHub Actions | Reproducible installs, test gates, container builds |

## Domain Model

- `Property` belongs to a Django user and scopes all user-owned data.
- `Meter` belongs to a property and has a `resource_type` such as electricity, water, gas, or heating.
- `Reading` stores a dated cumulative meter value.
- `Tariff` is global and selected by resource type and validity dates.
- `MonthlyCharge` is derived state, rebuilt from readings for a property/resource pair.
- `Payment` records user payments per property/month.

## Billing Strategy

Meter readings are cumulative. Billing uses positive deltas between chronological readings for the same meter. A reading update or deletion can change later deltas, so `MonthlyCharge` rows are rebuilt idempotently for the affected property/resource pair instead of incrementally patched.

This tradeoff is intentionally simple and reliable for the current data volume. It prevents stale charges after update/delete/out-of-order insertion and is covered by property-based tests.

## API Boundaries

- Every property-scoped queryset filters by `owner=request.user`.
- Serializer validation prevents writing meters, readings, or payments against another user's property.
- Analytics parameters are parsed explicitly and invalid values return `400`.
- Tariffs are global by product choice and editable by authenticated users for experimentation.

## Frontend Resilience

- Local storage values are parsed through safe helpers.
- Favorite chart configs are schema-filtered before use.
- Analytics and dashboard payloads are normalized before rendering charts/tables.
- Error payloads are converted into strings before rendering.

## Build And Runtime

- Backend dependencies are locked in `uv.lock`.
- Backend Dockerfile has separate `runtime` and `test` targets.
- Runtime image excludes pytest, Hypothesis, coverage, and other dev dependencies.
- Frontend Docker build excludes tests and coverage output from context.
- GitHub Actions run backend coverage, frontend coverage/build, and Docker image builds without requiring secrets.
