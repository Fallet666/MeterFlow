# Review Guide

Use this guide to evaluate MeterFlow quickly and reproducibly.

## High-Signal Checks

1. Run backend tests and coverage:
   ```bash
   cd backend
   uv run pytest --cov --cov-report=term-missing --cov-fail-under=90
   ```
2. Run frontend tests and coverage:
   ```bash
   cd frontend
   npm run test:coverage
   ```
3. Build frontend:
   ```bash
   cd frontend
   npm run build
   ```
4. Validate Docker builds:
   ```bash
   docker build --target runtime -t meterflow-backend-runtime ./backend
   docker build --target test -t meterflow-backend-test ./backend
   docker build -t meterflow-frontend ./frontend
   ```

## What To Inspect

- `backend/core/services.py`: idempotent billing rebuild logic.
- `backend/core/views.py`: ownership-filtered querysets and defensive analytics parsing.
- `backend/core/tests/test_fuzzing.py`: Hypothesis-generated billing and API validation cases.
- `frontend/src/safety.ts`: runtime guards for localStorage, numbers, arrays, and favorite chart configs.
- `frontend/src/__tests__/Fuzzing.test.tsx`: fast-check property tests for frontend resilience.
- `docs/architecture.md`: design choices and tradeoffs.
- `docs/quality.md`: coverage, verification commands, and quality checklist.

## Expected Results

- Backend line coverage: 96%.
- Frontend line coverage: 93.81%.
- Frontend branch coverage gate: 75% minimum.
- Backend coverage gate: 90% minimum in CI.
- Docker runtime/test/frontend images build without publishing or secrets.

## Product Scope

MeterFlow is intentionally focused on utility-metering flows: authentication, properties, meters, readings, derived monthly charges, payments, analytics, forecasts, and robust test coverage around those flows.
