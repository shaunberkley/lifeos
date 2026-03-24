# LifeOS Implementation Roadmap

Status: Phase 1 foundation

Date: 2026-03-23

This roadmap is subordinate to `docs/operations/hardening-program.md` until the repository reaches the first hardened baseline commit.

## Phase 1

The first milestone is a stable foundation commit:

- monorepo workspace and TypeScript baseline
- Biome, Vitest, Playwright, Turbo
- initial app and package shells
- Convex root layout
- CI and supply-chain scaffolding
- implementation docs

Before any new feature work, complete the hardening program gates for baseline hygiene, security enforcement, testing, and OSS governance.

## File Ownership For Early Parallel Work

- root config and package shells
- Convex layout and schema baseline
- docs and roadmap

Separate parallel slices:

- `.github/workflows/*`
- `apps/server/**`
- `apps/local-bridge/**`

## Next Milestones

1. Foundation
2. Auth and identity
3. Local bridge pairing and signed ingest
4. Integration pipeline and projectors
5. Core domain tables
6. Retrieval and evals
7. First cloud and restricted connectors

## Definition Of Done For Phase 1

- workspace structure exists
- root scripts are defined
- app and package boundaries are explicit
- architecture and roadmap are aligned
- CI shape is in place and any unimplemented path fails closed instead of pretending to be complete
