# Health Checks

LifeOS uses explicit health checks instead of assuming a process is alive because it is running.

## Server

The server health endpoint is `GET /health` and is implemented in `apps/server/src/routes/health.ts`.

Expected response:

```json
{ "ok": true, "service": "lifeos-server" }
```

In Docker Compose, the server container should report healthy before you treat the stack as booted.

## Local Bridge

The local bridge is a fail-closed daemon. It is not healthy unless pairing and durable queueing are configured.

The bridge start contract is defined by `apps/local-bridge/src/bridge.ts`.

Current readiness rule:

- no durable queue means not ready
- no active pairing means not ready
- any restricted-data path must still respect the data-class policy in `packages/security`

Do not hide that failure behind a success message.

## Operational Checks

- `docker compose ps`
- `docker compose logs -f server`
- `pnpm --filter @lifeos/server test`

If a health check starts passing for the wrong reason, tighten the check instead of relaxing the code.
