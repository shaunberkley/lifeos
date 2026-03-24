# Convex Agent Access

This runbook defines the safe way to give LifeOS coding agents access to Convex.

## Default Policy

- agents get **development** Convex access by default
- production Convex access is separate and opt-in
- agent access must come from Infisical-backed env injection, not pasted secrets

## Required Convex Values

LifeOS expects these values to be available through Varlock:

- `CONVEX_APPLICATION_ID`
- `CONVEX_DEPLOYMENT`
- `CONVEX_URL`
- `CONVEX_DEPLOY_KEY`

## Recommended Access Model

Use a dedicated Convex deployment key for agent work against a development deployment.

Do not point general coding sessions at production by default.

## How Agents Use It

Once Infisical and Varlock are configured, any coding agent that inherits the local shell environment can use:

- `pnpm secrets:check`
- `pnpm convex:dev`
- `pnpm convex:deploy`

That is the permanent access path. The secret values stay in Infisical, while the repo keeps only the schema and commands.

## Rotating Convex Access

1. Create or rotate the Convex deploy key.
2. Update `CONVEX_DEPLOY_KEY` in Infisical.
3. Restart any local shells or agents that cached the old environment.
4. Re-run `pnpm secrets:check`.

## MCP Guidance

If you run a Convex MCP server for AI tools, launch it from a shell that already has the Varlock-resolved env available. Do not duplicate the secret values in separate tool-specific config files unless the tool cannot inherit the shell environment.
