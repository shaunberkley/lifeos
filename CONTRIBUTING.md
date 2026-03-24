# Contributing to LifeOS

LifeOS is built to be easy for humans and AI agents to work on without guessing.

## Start Here

Read these first:

- `README.md`
- `docs/overview/what-is-lifeos.md`
- `docs/architecture/lifeos-technical-architecture.md`
- `docs/operations/hardening-program.md`
- `docs/architecture/implementation-roadmap.md`
- `docs/data-classification.md`

## Working Rules

- Use one GitHub issue per branch.
- Keep each pull request scoped to one child issue.
- Do not widen scope silently.
- If the repo structure surprises you, report it instead of encoding a new assumption.
- Prefer executable guardrails over documentation-only fixes.

## For AI Contributors

- Read the canonical docs before editing code.
- Do not duplicate instructions that already live in code, tests, or architecture docs.
- Treat `AGENTS.md` or `CLAUDE.md` as optional and minimal if they exist.
- Do not add new abstractions just because they look elegant.
- If a path is security-sensitive, default to fail-closed behavior.

## Quality Bar

Before opening a PR, verify the change with the narrowest useful checks, then summarize the evidence in the PR or issue closeout.

At minimum, include:

- what changed
- how it was validated
- any remaining follow-up

## Commit Messages

Use clear, conventional commit messages. The baseline first commit is reserved for `initial commit`.
