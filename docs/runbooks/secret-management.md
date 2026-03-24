# Secret Management

LifeOS treats secrets as operational data, not repository data.

## Rules

- never commit real secrets
- never paste secrets into prompt logs
- never store restricted local bridge data in cloud-backed plaintext state
- keep the repository template file `/.env.example` as the contract for required variables

## Current Secret Surfaces

The current template includes:

- `PORT`
- `AUTH_ISSUER`
- `CONVEX_APPLICATION_ID`
- `LOCAL_BRIDGE_SHARED_SECRET`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

## Storage Guidance

- server secrets belong in your untracked `.env` file or deployment environment variables
- local bridge secrets should live in the OS secret store when possible
- if a key or secret must be backed up, export it encrypted and store it outside the repo

## Rotation

1. Generate a new secret.
2. Update the local secret store or deployment environment.
3. Restart the affected service.
4. Verify the health check still passes.

Do not rotate by editing the repository to "remember" the secret.
