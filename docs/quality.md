# Quality Checklist

MeterFlow is structured to be easy to review, reproduce, and verify. This document lists the concrete engineering signals that should be checked when assessing the project.

## Verification Commands

Backend:

```bash
cd backend
uv run pytest --cov --cov-report=term-missing
```

Frontend:

```bash
cd frontend
npm run test:coverage
npm run build
```

Docker:

```bash
docker build --target runtime -t meterflow-backend-runtime ./backend
docker build --target test -t meterflow-backend-test ./backend
docker build -t meterflow-frontend ./frontend
docker compose config
docker compose --profile test config
```

## Current Coverage

| Area | Line coverage | Notes |
| --- | ---: | --- |
| Backend | 96% | Django models, serializers, API viewsets, services, billing rebuilds, analytics validation |
| Frontend | 93.81% | Routes, pages, API client, storage safety, malformed payload resilience, error boundary |

## Backend Quality Signals

- Dependencies are locked with `uv.lock` and Python is pinned through `.python-version`.
- Runtime and test Docker targets are separated, so production images do not include test-only packages.
- Billing is recalculated idempotently for a property/resource pair after reading create/update/delete flows.
- Analytics query parameters are parsed defensively and return `400` for invalid input instead of leaking tracebacks.
- Ownership checks prevent users from creating meters, readings, or payments against other users' properties.
- Property-based Hypothesis tests cover randomly generated reading histories and malformed analytics parameters.

## Frontend Quality Signals

- API payloads are normalized before rendering charts and tables, avoiding crashes on malformed arrays or numbers.
- `localStorage` user, active property, and favorite chart values are parsed through safe helpers.
- Error payloads from the backend are converted to renderable fallback strings.
- Component tests cover login, registration, dashboard loading, readings submission, analytics, properties, meters, API client setup, and error fallback.
- Docker build excludes tests and coverage reports from the production frontend context.

## Container Build Optimizations

- Backend uses Docker BuildKit cache mounts for `uv` package downloads.
- Backend production image excludes dev dependencies and starts with plain `python manage.py ...`.
- Backend test image keeps dev dependencies isolated in a separate target.
- Frontend uses npm cache mounts and disables audit/funding work during deterministic CI installs.
- Compose test profile persists npm cache and `node_modules` in named volumes for faster repeated test runs.

## Known Tradeoffs

- Frontend chunk size is above Vite's default warning threshold because Recharts and route-level UI are bundled together. Code splitting would reduce the warning but was not added to avoid unnecessary routing complexity.
- Tariffs are global and editable by authenticated users by product decision; this keeps the app simple for utility-cost experimentation.
- SQLite remains the default local database for convenience, while Docker Compose uses PostgreSQL.
