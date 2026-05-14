# Security Policy

## Supported Version

The `main` branch is the supported development line.

## Reporting Issues

Please report vulnerabilities privately to the repository owner. Do not open a public issue for secrets, authentication bypasses, or data isolation bugs.

## Current Security Controls

- API access uses JWT authentication.
- DRF default permissions require authenticated requests except registration/login.
- Property-scoped resources are filtered by the authenticated owner.
- Serializers validate cross-owner writes for meters, readings, and payments.
- Analytics query parameters are parsed defensively and return `400` on invalid input.
- Frontend rendering guards malformed API payloads and localStorage values.

## Secrets

No deployment secrets are required for CI. GitHub Actions only runs tests and Docker builds without publishing images.

For production deployments, move Django `SECRET_KEY`, database credentials, allowed hosts, CORS origins, and JWT settings into a secret manager or environment-specific configuration.
