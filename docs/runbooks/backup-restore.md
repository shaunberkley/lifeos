# Backup and Restore

Back up the state that matters, not the source tree.

## What To Back Up

- the untracked `.env` file or equivalent deployment environment export
- any local auth SQLite database once the self-hosted auth path is enabled
- local bridge key material from the OS secret store or encrypted export path
- Convex data exports or backups when using a self-hosted Convex deployment

## Backup Order

1. Stop writes.
2. Snapshot the persistent volumes or files.
3. Export secrets separately and encrypt them.
4. Verify the archive before deleting the source copy.

## Restore Order

1. Restore secrets first.
2. Restore the persistent data.
3. Start the server with `docker compose up`.
4. Confirm `GET /health` returns healthy.

## Failure Policy

If restore requires a secret to be committed to the repository, stop and redesign the secret handling instead.
