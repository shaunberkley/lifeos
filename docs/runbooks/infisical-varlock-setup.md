# Infisical and Varlock Setup

This is the canonical setup for LifeOS secrets, local development, and AI agent access.

## Why This Exists

LifeOS needs two things at the same time:

- a repository-safe way to describe configuration for humans and AI agents
- a secret manager that can give local tools and coding agents durable access without pasting secrets into chat

The stack is:

- **Infisical** for secret storage and machine identities
- **Varlock** for the committed env schema and runtime secret loading

## Required Infisical Objects

Create these before trying to run the repo through Varlock:

1. Create or choose the Infisical project for LifeOS.
2. Create a machine identity named something like `lifeos-coding-agents`.
3. Use **Universal Auth** for that identity.
4. Grant it access to the environment you want agents to use by default.

Recommended environments:

- `development`
- `staging`
- `production`

Recommended default for coding agents:

- `development`

## Required Local Bootstrap Variables

These are the only values that should live in your local env file or shell profile:

- `INFISICAL_PROJECT_ID`
- `INFISICAL_ENVIRONMENT`
- `INFISICAL_CLIENT_ID`
- `INFISICAL_CLIENT_SECRET`

Everything else should be resolved through Infisical by Varlock.

## Required Infisical Secret Keys

Store these secrets under the configured secret path `/lifeos`:

- `AUTH_ISSUER`
- `CONVEX_APPLICATION_ID`
- `CONVEX_DEPLOYMENT`
- `CONVEX_URL`
- `CONVEX_DEPLOY_KEY`
- `LOCAL_BRIDGE_SHARED_SECRET`

You can also move these into Infisical later if you want full centralization:

- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

## Bootstrap Steps

1. Copy `.env.example` to your local `.env` file if you want a local checklist.
2. Fill in only the Infisical machine-identity values locally.
3. Keep runtime secrets in Infisical.
4. Run `pnpm install`.
5. Run `pnpm secrets:check`.

If `pnpm secrets:check` fails, do not work around it by hardcoding secrets into source or prompt text.

## Runtime Commands

These commands now load secrets through Varlock:

- `pnpm dev`
- `pnpm dev:web`
- `pnpm dev:server`
- `pnpm dev:bridge`
- `pnpm convex:dev`
- `pnpm convex:deploy`

## Agent Access Policy

For human contributors and AI agents:

- use the same Infisical machine identity contract
- default to the `development` environment
- keep production access separate and opt-in
- never paste `CONVEX_DEPLOY_KEY` or other secrets into chat

## Optional Infisical CLI

If you prefer to link the project locally with Infisical CLI, use `infisical init` to generate `.infisical.json`. That file is intentionally gitignored.
