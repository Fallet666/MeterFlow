# Contributing

## Local Setup

Backend:

```bash
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py runserver 0.0.0.0:8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --host --port 5173
```

## Quality Gates

Run these before opening a pull request:

```bash
cd backend
uv run pytest --cov --cov-report=term-missing --cov-fail-under=90
```

```bash
cd frontend
npm run test:coverage
npm run build
```

## Commit Style

Use scoped commit prefixes:

- `[backend] ...`
- `[frontend] ...`
- `[db] ...`
- `[deploy] ...`

## Testing Expectations

- Add backend tests for serializer, service, and API behavior changes.
- Add frontend tests for user-visible behavior, storage parsing, and API error handling.
- Use property-based tests when behavior depends on a broad input space, especially billing, validation, and malformed payload handling.
