# Self-Host Bootstrap

This is the supported first self-host path for LifeOS.

The baseline is intentionally small:

- `docker-compose.yml` runs the Hono server
- the server exposes `/health`
- restricted-data processing stays on the local bridge and is not forced into the compose stack
- auth and webhook ingress fail closed until the later identity and integration work lands

## Prerequisites

- Docker and Docker Compose
- an untracked local `.env` file copied from `.env.example`
- a Convex deployment plan, if you are connecting to Convex outside the repository scaffold

## Bootstrap

1. Copy `.env.example` to `.env`.
2. Fill in the required values for your environment.
3. Start the supported baseline with `docker compose up`.
4. Wait for the `server` container to report healthy.
5. Verify `http://localhost:3000/health` returns `{"ok":true,"service":"lifeos-server"}`.

## What This Baseline Does Not Do

- It does not claim the local bridge is fully self-hosted in compose.
- It does not silently enable auth or webhooks; those remain fail closed until the later identity work.
- It does not store secrets in the repository.

## Stop Conditions

If the health endpoint is not green, stop and inspect the container logs before adding more services.

If a secret needs to be committed to make the baseline work, the baseline is wrong.
