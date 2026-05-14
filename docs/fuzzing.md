# Fuzz Testing

MeterFlow uses property-based fuzzing to exercise business invariants with generated inputs. This is not binary fuzzing with AFL/libFuzzer; tests run inside the existing pytest and Vitest suites.

## Backend

Tooling: `uv`, `hypothesis`, `pytest`, `pytest-django`.

Run all backend tests:

```bash
cd backend
uv run pytest
```

Run only backend fuzz tests:

```bash
cd backend
uv run pytest core/tests/test_fuzzing.py
```

Measure backend coverage:

```bash
cd backend
uv run pytest --cov --cov-report=term-missing
```

Covered invariants:

- Chronological meter readings produce `MonthlyCharge` rows equal to the sum of positive deltas.
- Reprocessing, updating, and deleting readings rebuild monthly charges instead of accumulating stale values.
- Malformed `/api/analytics/` query parameters return `400` or a valid response, never `500`.
- Invalid financial payloads are rejected: negative payments, negative readings, negative tariffs, and months outside `1..12`.

To increase backend fuzz depth, raise `max_examples` in `backend/core/tests/test_fuzzing.py`. Keep `deadline=None` for Django DB tests because database setup and ORM work are intentionally slower than pure functions.

## Frontend

Tooling: `fast-check`, `Vitest`, Testing Library.

Run all frontend tests:

```bash
cd frontend
npm test
```

Run only frontend fuzz tests:

```bash
cd frontend
npm run test:fuzz
```

Measure frontend coverage:

```bash
cd frontend
npm run test:coverage
```

Covered invariants:

- Arbitrary `localStorage` strings do not crash user, active-property, or favorite-chart parsing.
- Structurally invalid favorite chart records are ignored before query building and rendering.
- Dashboard and analytics screens tolerate malformed API payloads by normalizing arrays and numbers.
- Invalid numeric reading inputs such as `Infinity` are rejected on the client.

To increase frontend fuzz depth, raise `numRuns` in `frontend/src/__tests__/Fuzzing.test.tsx`.

## CI Notes

The Docker Compose `test` profile runs the regular backend and frontend commands, so fuzz tests are included automatically:

```bash
docker compose --profile test up --build --abort-on-container-exit
```

Use Node.js 20+ for frontend commands. React Router 7 declares `node >=20`, and npm prints engine warnings on older local runtimes.
