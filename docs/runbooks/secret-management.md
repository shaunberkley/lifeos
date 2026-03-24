# Secret Management

LifeOS treats secrets as operational data, not repository data.

## Rules

- never commit real secrets
- never paste secrets into prompt logs
- never store restricted local bridge data in cloud-backed plaintext state
- keep `.env.schema` as the canonical contract for required variables
- keep `/.env.example` as a bootstrap template only
- store long-lived operational secrets in Infisical, not in local dotfiles
- use Varlock as the runtime secret loader for developers and AI agents

## Canonical Secret Platform

LifeOS now uses:

- **Infisical** as the secret manager and machine-identity boundary
- **Varlock** as the repository-safe config schema, runtime loader, and AI-safe env contract

The root `.env.schema` file is safe to commit. It documents the variables, types, defaults, and sensitive fields without committing secret values.

## Current Secret Surfaces

The current template includes:

- `INFISICAL_PROJECT_ID`
- `INFISICAL_ENVIRONMENT`
- `INFISICAL_CLIENT_ID`
- `INFISICAL_CLIENT_SECRET`
- `PORT`
- `WEB_ORIGIN`
- `AUTH_ISSUER`
- `BETTER_AUTH_SECRET`
- `CONVEX_APPLICATION_ID`
- `CONVEX_DEPLOYMENT`
- `CONVEX_URL`
- `CONVEX_DEPLOY_KEY`
- `LOCAL_BRIDGE_SHARED_SECRET`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

## Storage Guidance

- machine-identity values belong in your untracked local env file or deployment environment variables
- server and Convex secrets belong in Infisical
- auth database paths and local web origins are safe local defaults, not secrets
- local bridge secrets should live in the OS secret store when possible
- if a key or secret must be backed up, export it encrypted and store it outside the repo

## Rotation

1. Generate a new secret.
2. Update Infisical or the local secret store.
3. Restart the affected service.
4. Verify the health check still passes.

Do not rotate by editing the repository to "remember" the secret.
