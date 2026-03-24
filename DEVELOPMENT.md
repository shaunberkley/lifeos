# Development

This repository is a TypeScript monorepo with Convex, a Hono server, a web app, and a local bridge.

## Prerequisites

- Node 24
- pnpm 10.6.5
- Git

## Setup

1. Clone the repository.
2. Install dependencies with `pnpm install`.
3. Copy `.env.example` to your local env file only for local placeholders; production and agent access should come from Infisical.
4. Populate the Infisical machine-identity values described in `docs/runbooks/infisical-varlock-setup.md`.
5. Run `pnpm secrets:check` to verify the Varlock + Infisical secret graph.
6. Run `pnpm check` to verify the workspace.

## Common Commands

- `pnpm dev` - run workspace dev scripts in parallel
- `pnpm dev:web` - run the Vite app with Varlock env loading
- `pnpm dev:server` - run the Hono server with Varlock-injected secrets
- `pnpm dev:bridge` - run the local bridge with Varlock-injected secrets
- `pnpm lint` - run Biome and workspace lint tasks
- `pnpm secrets:check` - validate the `.env.schema` contract and Infisical access
- `pnpm convex:dev` - run Convex dev with Varlock-injected secrets
- `pnpm convex:deploy` - deploy Convex with Varlock-injected secrets
- `pnpm typecheck` - run TypeScript checks across the workspace
- `pnpm test` - run the workspace test tasks
- `pnpm check` - run lint, typecheck, and test together

## Environment

Use `.env.schema` as the source of truth for required variables and secret policy. Keep `.env.example` as a bootstrap template only.

Do not commit secrets. Restricted or private data should stay local unless the architecture says otherwise.

Infisical + Varlock is the canonical path for local development, Convex access, and AI agent access.

## Self-Hosting

The supported bootstrap path is documented in [docs/runbooks/self-host-bootstrap.md](./docs/runbooks/self-host-bootstrap.md).

Use [docs/runbooks/health-checks.md](./docs/runbooks/health-checks.md) to verify service readiness, and keep secret handling aligned with [docs/runbooks/secret-management.md](./docs/runbooks/secret-management.md).

## Repo Layout

- `apps/web` - React frontend
- `apps/server` - Hono server and auth/webhook boundary
- `apps/local-bridge` - local data processing and restricted connectors
- `convex` - backend schema, functions, and HTTP handlers
- `packages` - shared libraries and domain code
- `docs` - architecture, operations, and contributor-facing docs

## Working With AI

- Keep changes scoped to one issue at a time.
- Add evidence to the closing comment or PR.
- If a tool-generated instruction file drifts from reality, remove or shrink it.
- Prefer deterministic, explicit behavior over clever automation.
