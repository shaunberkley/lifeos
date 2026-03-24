# `apps/local-bridge`

Local-only daemon for LifeOS restricted-data processing.

Responsibilities:

- device pairing
- signed envelope delivery to Convex
- offline queueing
- local inference and local-only connectors

This daemon is part of the privacy boundary. Keep restricted data processing here, not in the cloud apps.
