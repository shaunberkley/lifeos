# `apps/server`

Minimal Hono-based edge server for LifeOS.

Responsibilities:

- auth endpoints
- OAuth callbacks
- webhook ingress that should not go straight to Convex
- static asset hosting for self-hosted mode

This directory is intentionally small. Keep application logic in `src/` and keep the server thin.
