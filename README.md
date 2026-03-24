# LifeOS

LifeOS is a personal AI life management platform built as a TypeScript monorepo with Convex, a mandatory local privacy boundary, and self-hosting as a first-class requirement.

It is designed to ingest the important signals in a person's life, turn them into durable typed state, and use policy-constrained AI to help with planning, retrieval, synthesis, and action.

LifeOS is not a generic chat wrapper. The product is a typed application with AI layered on top of it.

## What It Is

LifeOS is intended to manage:

- tasks, projects, priorities, and deadlines
- calendar, routines, and scheduling
- notes, documents, links, and inbox capture
- contacts and relationship context
- memory and retrieval across structured and unstructured information
- automations, reminders, and approvals
- selected health, finance, and camera-derived signals

The core architecture splits the system in two:

- Convex holds sync-safe application state and workflows
- the local bridge handles restricted raw data and local Ollama processing

Only sanitized, policy-approved derivatives are allowed to cross from local processing into cloud-backed state.

## Status

Foundation scaffolding is in progress. The current repo contains:

- the canonical architecture document
- monorepo and tooling configuration
- initial app and package shells
- the first implementation roadmap
- the hardening program that gates feature work

## Core Principles

- Restricted health, finance, and camera raw data stays local.
- Convex is the sync-safe system of record.
- Integrations ingest append-only events and project into typed domain tables.
- AI proposes, workflows execute, policies approve.

## Docs

- [What Is LifeOS?](./docs/overview/what-is-lifeos.md)
- [Technical Architecture](./docs/architecture/lifeos-technical-architecture.md)
- [Implementation Roadmap](./docs/architecture/implementation-roadmap.md)
- [Hardening Program](./docs/operations/hardening-program.md)
- [Infisical + Varlock Setup](./docs/runbooks/infisical-varlock-setup.md)
- [Convex Agent Access](./docs/runbooks/convex-agent-access.md)
- [Self-Host Bootstrap](./docs/runbooks/self-host-bootstrap.md)
- [Health Checks](./docs/runbooks/health-checks.md)
- [Secret Management](./docs/runbooks/secret-management.md)
- [Backup and Restore](./docs/runbooks/backup-restore.md)
- [Data Classification](./docs/data-classification.md)
- [License](./LICENSE)
- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)
- [Development](./DEVELOPMENT.md)
