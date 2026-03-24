# Manual PR Review Workflow

This is the canonical temporary workflow for AI-assisted pull request review in LifeOS until the automated `pr-review --deep` system lands.

## Purpose

Use a separate reviewer agent with full repository context to review a PR for bugs, regressions, security/privacy issues, missing tests, and architectural drift.

The reviewer is not the implementation agent.

## Review Rules

- Review findings come first.
- Prioritize correctness, security, regressions, and missing validation over style.
- Cite concrete files when possible.
- Do not suggest speculative refactors unless they block safe merge.
- Do not edit code during review.
- If there are no findings, say that explicitly and call out residual risk.

## Required Context

The reviewer should have access to:

- the full checked-out repository
- the PR diff
- the base branch
- local docs and runbooks
- test and lint commands

## Standard Review Prompt

Use this prompt for manual deep review:

```text
Review PR #<number> in this repository as a separate reviewer, not as the implementation agent.

Focus on:
- correctness bugs
- behavioral regressions
- security and privacy issues
- missing or weak tests
- architectural drift from the documented LifeOS patterns

Ignore:
- cosmetic style issues
- optional refactors that are not required for safe merge

Process:
1. Read the PR title, body, changed files, and diff.
2. Inspect any nearby code needed to understand impact.
3. Run or inspect the relevant validation paths if needed.
4. Produce findings first, ordered by severity.
5. For each finding, include a short explanation and concrete file references.
6. If there are no blocking findings, say the PR is safe to merge and note any residual risks.

Output format:
- Findings
- Residual Risks / Open Questions
- Merge Recommendation
```

## Deep Review Passes

For a deeper manual review, split the work into specialist passes and synthesize a single result:

- architecture and data flow
- security, privacy, and auth
- test coverage and determinism
- CI, supply chain, and operator impact

The final review should still be one synthesized merge recommendation.

## Suggested Commands

Use non-destructive commands only.

```bash
gh pr view <number> --json title,body,files,headRefName,baseRefName,mergeStateStatus
gh pr diff <number>
gh pr checks <number>
```

If local inspection is needed:

```bash
gh pr checkout <number>
git diff origin/main...
pnpm lint
pnpm typecheck
pnpm test
```

## Current Merge Heuristic

- `safe to merge`: no concrete blocking findings
- `fix before merge`: one or more correctness, security, or regression findings
- `close or replace`: stale, misleading, or superseded PR with no meaningful merge value

## Transition Plan

This manual workflow is temporary. The long-term implementation is tracked in:

- issue `#96` and its child issues
- especially `#115` and `#116`
