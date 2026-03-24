# LifeOS Hardening Program

Status: active

Date: 2026-03-23

## Purpose

This document is the canonical hardening plan for taking the repository from the current scaffold to an auditable, deterministic, OSS-ready baseline.

The goal is not "looks good." The goal is `100/100` against explicit engineering gates before more feature work.

## Source Of Truth

Use three layers, each for a different purpose:

1. This file is the canonical scope, sequencing, scoring rubric, and definition of done.
2. GitHub Issues are the canonical execution units.
3. One GitHub Project is the canonical live status board and roadmap.

Do not duplicate live execution state in `AGENTS.md`, `CLAUDE.md`, random chat threads, or ad hoc TODO files.

## Where Contributors Should Look First

Every human and AI contributor should read these files first:

- `README.md`
- `docs/architecture/lifeos-technical-architecture.md`
- `docs/data-classification.md`
- `docs/operations/hardening-program.md`
- `docs/architecture/implementation-roadmap.md`

## Tracking Model

After the first baseline push:

- create one repository project called `LifeOS`
- create one parent issue per hardening workstream
- create child sub-issues for concrete execution items
- use issue dependencies for blocked work
- require every PR to link exactly one child issue
- require every merged child issue to attach evidence: test output, screenshots, logs, or command transcript

Use GitHub sub-issues, not Markdown tasklists, for decomposing work. Sub-issues support hierarchy in GitHub Issues and Projects, and GitHub tasklist blocks have been retired in favor of sub-issues.

## GitHub Project Shape

Create these views:

- `Board`: grouped by `Status`
- `Ready For Agent`: filtered to unblocked issues with an explicit file scope
- `Roadmap`: grouped by `Workstream`, ordered by `Target`
- `Evidence Needed`: filtered to done issues missing proof links
- `Blocked`: filtered to dependency-blocked work

Create these project custom fields:

- `Status`: `Backlog`, `Ready`, `In Progress`, `Blocked`, `In Review`, `Done`
- `Priority`: `P0`, `P1`, `P2`
- `Workstream`: `H0` through `H7`
- `Write Scope`: short text naming the allowed files or directories
- `Owner`: GitHub assignee
- `Agent`: `human`, `codex`, `claude`, or tool-specific worker name
- `Target`: date field
- `Score Impact`: number field
- `Evidence`: text or URL field

Use project custom fields for this public repository. Do not depend on organization issue fields for the live tracker.

Use built-in project automations for status changes on close and merge. Use issue dependencies for actual blocking relationships instead of encoding blockers in labels.

## Labels

Create these labels:

- `area:root`
- `area:docs`
- `area:ci`
- `area:security`
- `area:server`
- `area:local-bridge`
- `area:convex`
- `area:logging`
- `area:tests`
- `area:self-hosting`
- `priority:p0`
- `priority:p1`
- `priority:p2`
- `kind:hardening`
- `kind:docs`
- `kind:test`
- `kind:security`
- `kind:ci`
- `blocked`
- `good-first-issue`

## Scoring Rubric

The repository is `100/100` only when every category below reaches its target score.

| Category | Target |
| --- | ---: |
| Git hygiene | 10 |
| Runtime and dependency determinism | 10 |
| TypeScript and lint guardrails | 10 |
| Testing and coverage | 15 |
| Security enforcement | 20 |
| CI/CD and supply chain | 15 |
| OSS governance | 10 |
| Error contracts and observability | 5 |
| Self-hosting and contributor setup | 5 |
| **Total** | **100** |

## First Commit Gate

Waiting for `100/100` before the first commit is a mistake. The repo needs an auditable baseline early.

Make the first commit only after all of these are true:

- no `.DS_Store`, `.turbo`, or other junk files are staged
- `.editorconfig` and `.gitattributes` exist
- Node and pnpm are pinned consistently in repo config and CI
- root dependencies and GitHub Actions are pinned tightly enough for reproducibility
- `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.env.example`, and `DEVELOPMENT.md` exist
- no package bypasses missing tests with a fake-green flag
- at least one real test exists for each layer: domain, security, server, Convex, and web
- security placeholders either fail closed with `501` or are implemented with tests
- local hooks are installed and CI enforces the same checks
- the worktree is clean and reviewable

When those conditions are met, the first commit message must be:

`initial commit`

## Workstreams

### H0. Baseline Hygiene And Determinism

Parent issue:

- `H0: baseline hygiene and runtime determinism`

Child issues:

- `H0.1 remove artifacts and normalize repo hygiene`
- `H0.2 add .editorconfig and .gitattributes`
- `H0.3 pin Node and pnpm across local and CI`
- `H0.4 tighten dependency pinning policy`
- `H0.5 clean duplicated tsconfig drift`
- `H0.6 satisfy first-commit gate`

Primary write scope:

- root dotfiles
- `package.json`
- `pnpm-lock.yaml`
- `tsconfig*.json`
- `biome.json`

### H1. OSS Governance And Contributor Contract

Parent issue:

- `H1: oss governance and contributor contract`

Child issues:

- `H1.1 add AGPL-3.0 license`
- `H1.2 add SECURITY.md and disclosure policy`
- `H1.3 add CONTRIBUTING.md and review expectations`
- `H1.4 add CODE_OF_CONDUCT.md`
- `H1.5 add DEVELOPMENT.md and .env.example`
- `H1.6 add issue templates and pull request template`
- `H1.7 define branch protection and required checks`

Primary write scope:

- root docs
- `.github/ISSUE_TEMPLATE/**`
- `.github/pull_request_template.md`

### H2. CI/CD And Supply Chain

Parent issue:

- `H2: ci cd and supply-chain hardening`

Child issues:

- `H2.1 pin GitHub Actions to immutable SHAs`
- `H2.2 add Dependabot for npm and GitHub Actions`
- `H2.3 add OpenSSF Scorecard and REUSE lint`
- `H2.4 make secret scanning enforceable locally and in CI`
- `H2.5 replace supply-chain placeholders with real jobs or explicit fail-closed stubs`
- `H2.6 add coverage reporting and required thresholds`

Primary write scope:

- `.github/**`
- hook installation scripts
- root config needed by CI

### H3. Security Primitives And Policy Enforcement

Parent issue:

- `H3: security primitives and policy enforcement`

Child issues:

- `H3.1 implement signing and verification primitives in packages/security`
- `H3.2 implement classification guard helpers that fail closed`
- `H3.3 make local bridge pairing and queue contracts explicit`
- `H3.4 make auth and webhook routes fail closed until implemented`
- `H3.5 wire minimal Convex auth config or explicit disabled state`
- `H3.6 add security invariants and regression tests`

Primary write scope:

- `packages/security/**`
- `apps/local-bridge/**`
- `apps/server/src/routes/**`
- `convex/auth.config.ts`

### H4. Testing And Determinism Harness

Parent issue:

- `H4: testing and determinism harness`

Child issues:

- `H4.1 remove fake-green test bypasses everywhere`
- `H4.2 add domain invariant tests`
- `H4.3 add security primitive tests`
- `H4.4 add server route tests`
- `H4.5 add Convex function tests`
- `H4.6 add web smoke tests`
- `H4.7 add deterministic test helpers for time, randomness, and fixtures`

Primary write scope:

- test files across `apps/**`, `packages/**`, and `convex/**`
- `vitest.config.ts`
- `playwright.config.ts`

### H5. Error Contracts And Observability

Parent issue:

- `H5: error contracts and observability`

Child issues:

- `H5.1 add AppError hierarchy and domain-specific errors`
- `H5.2 implement structured logger package`
- `H5.3 ban console usage outside approved bootstrap paths`
- `H5.4 add correlation IDs and request context`
- `H5.5 add tests for error serialization and logger shape`

Primary write scope:

- `packages/logging/**`
- shared error packages
- `apps/server/**`
- `apps/local-bridge/**`

### H6. Self-Hosting And Operator Docs

Parent issue:

- `H6: self-hosting baseline and operator docs`

Child issues:

- `H6.1 add docker-compose baseline`
- `H6.2 add service health checks`
- `H6.3 document self-hosted bootstrap`
- `H6.4 document secret management and local key storage`
- `H6.5 add backup and restore runbook`

Primary write scope:

- `docker-compose.yml`
- `docs/runbooks/**`
- setup docs

### H7. Execution Management

Parent issue:

- `H7: execution management and project setup`

Child issues:

- `H7.1 create GitHub project and fields`
- `H7.2 create parent issues and child issue hierarchy`
- `H7.3 add issue dependencies`
- `H7.4 add saved project views`
- `H7.5 define score update cadence`

Primary write scope:

- GitHub metadata
- this plan when scope changes

## Parallel Work Rules

Multiple agents are allowed only when the write scopes do not collide.

Safe parallel slices:

- `packages/security/**`
- `packages/logging/**`
- `apps/local-bridge/**`
- `apps/server/src/routes/**`
- `.github/**`
- `docs/**`

Do not split these across agents at the same time:

- root `package.json`
- `pnpm-lock.yaml`
- `tsconfig.base.json`
- `biome.json`
- `turbo.json`
- `README.md`

Use one integration owner:

- one main agent owns sequencing, integration, and final review
- worker agents own one child issue each
- every child issue must declare its write scope before work starts
- no worker may expand scope without updating the issue first

## Recommended Multi-Agent Batch Order

Batch 1:

- H0.1, H0.2, H0.3
- H1.1, H1.2, H1.3, H1.4
- H2.1, H2.2

Batch 2:

- H1.5, H1.6
- H3.1, H3.2
- H4.1, H4.2, H4.3

Batch 3:

- H3.3, H3.4, H3.5
- H4.4, H4.5, H4.6, H4.7
- H5.1, H5.2, H5.3

Batch 4:

- H5.4, H5.5
- H6.1, H6.2, H6.3, H6.4, H6.5
- H7.1, H7.2, H7.3, H7.4, H7.5

## Exit Criteria For 100/100

The repo is `100/100` only when all of the following are true:

- all rubric categories hit target score
- no placeholder path pretends to be implemented
- every required CI check is mandatory on `main`
- every security boundary has executable tests
- contributor setup works from a clean machine using documented steps
- the GitHub Project reflects reality and has no stale `In Progress` items
- the architecture doc, hardening plan, and repo state agree

## Update Rule

Update this file only when one of these changes:

- the scoring rubric
- the workstream breakdown
- the first-commit gate
- the definition of done

Do not update this file for routine status changes. That belongs in GitHub Issues and the GitHub Project.
