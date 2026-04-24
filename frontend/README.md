# MeterFlow Frontend

React + Vite SPA for MeterFlow.

## Commands

```bash
npm install
npm run dev
npm test
npm run test:fuzz
npm run build
```

Use Node.js 20+ for local development. React Router 7 declares `node >=20`.

## Fuzzing

Frontend fuzzing lives in `src/__tests__/Fuzzing.test.tsx` and uses `fast-check` with Vitest. It checks safe parsing of `localStorage`, favorite chart config validation, and resilience to malformed API payloads.

More details: `../docs/fuzzing.md`.
