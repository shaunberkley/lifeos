# LifeOS: AI-Driven Codebase Architecture Plan

> **Purpose:** This document defines how LifeOS should be built as a 100% AI-authored codebase. It covers project structure, coding standards, testing strategy, CI/CD, and the specific patterns that make AI (Claude Code, Codex, Cursor, etc.) produce high-quality, maintainable, OSS-ready code.
>
> **Context:** LifeOS is an open-core personal AI life management platform. Solo developer, all code written by AI coding tools. Will be open-sourced and subject to community scrutiny. Uses Convex as the backend (real-time, infra-as-code, TypeScript-native).

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Project Structure](#project-structure)
3. [Convex Backend Architecture](#convex-backend-architecture)
4. [Type System & Schema Design](#type-system--schema-design)
5. [Coding Standards](#coding-standards)
6. [AI Coding Workflow](#ai-coding-workflow)
7. [Testing Strategy](#testing-strategy)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Error Handling](#error-handling)
10. [Security Architecture](#security-architecture)
11. [Integration Framework](#integration-framework)
12. [Memory & Learning System](#memory--learning-system)
13. [AGENTS.md — Minimal Steering Only](#agentsmd--claudemd--minimal-steering-only)
14. [File & Function Size Limits](#file--function-size-limits)
15. [Dependency Policy](#dependency-policy)
16. [Documentation Standards](#documentation-standards)
17. [Git & Branching Strategy](#git--branching-strategy)
18. [Recommended Architecture Diagram](#recommended-architecture-diagram)

---

## Design Principles

These are non-negotiable. Every design decision should pass through these filters:

1. **KISS** — The simplest solution that works. No premature abstraction. Three similar lines > one clever helper.
2. **DRY** — Single source of truth for data shapes (Convex schema), business logic (Convex functions), and config. But: repeating code for different concerns is fine. DRY applies to *knowledge*, not *code*.
3. **Schema-driven** — The Convex `schema.ts` file is the single source of truth. Types, validators, and client-side types all derive from it. Never duplicate a type that can be inferred.
4. **Infra as code** — Everything that defines how the system works lives in version-controlled files. Zero dashboard configuration. A fresh clone + `npx convex dev` = fully running system.
5. **AI-legible** — Files are small (<300 lines), functions are small (<50 lines), naming is explicit, patterns are consistent. AI tools produce better code when the codebase is scannable.
6. **Fail loudly** — Strict types, strict linting, pre-commit checks. Catch errors at compile time, not runtime. Never silently swallow errors.
7. **Security by default** — Auth checks in every query/mutation. Field-level encryption for sensitive data. Tier-based processing routing.
8. **Test-defined behavior** — Tests specify what the system should do. AI implements to match. Tests are the spec.

---

## Project Structure

```
lifeos/
├── convex/                         # ENTIRE BACKEND (Convex infra-as-code)
│   ├── schema.ts                   # Single source of truth for all data
│   ├── _generated/                 # Auto-generated types (committed)
│   │
│   ├── # ── Core Domain ──
│   ├── tasks.ts                    # Task CRUD, priority scoring, kanban
│   ├── tasks.test.ts               # Tests live next to source
│   ├── memory.ts                   # Episodes, knowledge, recall
│   ├── memory.test.ts
│   ├── contacts.ts                 # People/CRM, relationships
│   ├── contacts.test.ts
│   ├── feedback.ts                 # User feedback, learning signals
│   ├── feedback.test.ts
│   ├── coding.ts                   # Claude Code/Codex session tracking
│   ├── analytics.ts                # Report generation, aggregation
│   │
│   ├── # ── Infrastructure ──
│   ├── auth.ts                     # Auth configuration
│   ├── auth.config.ts              # Auth providers
│   ├── http.ts                     # HTTP routes (webhooks, API)
│   ├── crons.ts                    # Scheduled jobs
│   ├── crons.test.ts
│   │
│   ├── # ── Shared Utilities ──
│   ├── lib/
│   │   ├── scoring.ts              # Priority scoring math
│   │   ├── scoring.test.ts
│   │   ├── encryption.ts           # Field-level encryption helpers
│   │   ├── encryption.test.ts
│   │   ├── validators.ts           # Shared Convex validators
│   │   └── constants.ts            # Enums, config values
│   │
│   └── # ── Integration Actions ──
│       ├── actions/
│       │   ├── gmail.ts            # Gmail sync/send actions
│       │   ├── slack.ts            # Slack integration actions
│       │   ├── github.ts           # GitHub integration actions
│       │   ├── oura.ts             # Oura Ring health data
│       │   ├── reolink.ts          # Camera event processing
│       │   └── claude-code.ts      # Session ingestion
│
├── apps/
│   ├── web/                        # Dashboard (Vite + React + TailwindCSS)
│   │   ├── src/
│   │   │   ├── routes/             # File-based routing
│   │   │   ├── components/         # Shared UI components
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   └── lib/                # Client-side utilities
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── mcp-server/                 # MCP server for AI clients
│   │   ├── src/
│   │   │   ├── server.ts           # MCP server setup
│   │   │   ├── tools/              # MCP tool definitions
│   │   │   │   ├── tasks.ts
│   │   │   │   ├── memory.ts
│   │   │   │   ├── integrations.ts
│   │   │   │   ├── contacts.ts
│   │   │   │   └── reports.ts
│   │   │   └── lib/
│   │   │       └── convex-client.ts # Convex Node SDK wrapper
│   │   └── package.json
│   │
│   └── cli/                        # CLI for quick interactions
│       ├── src/
│       │   ├── index.ts            # Entry point
│       │   ├── commands/           # CLI commands
│       │   └── lib/
│       │       └── convex-client.ts
│       └── package.json
│
├── packages/
│   ├── integrations/               # Pluggable integration adapters
│   │   ├── gmail/
│   │   │   ├── manifest.json       # Auto-discovered metadata
│   │   │   ├── adapter.ts          # IntegrationAdapter implementation
│   │   │   ├── actions.ts          # Available actions
│   │   │   └── adapter.test.ts
│   │   ├── slack/
│   │   ├── github/
│   │   ├── oura/
│   │   ├── reolink/
│   │   └── _template/              # Scaffold for new integrations
│   │       ├── manifest.json
│   │       ├── adapter.ts
│   │       └── actions.ts
│   │
│   ├── shared/                     # Shared types, constants, utilities
│   │   ├── src/
│   │   │   ├── types.ts            # Cross-package types
│   │   │   ├── constants.ts        # Shared constants
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── security/                   # Encryption, tier routing
│       ├── src/
│       │   ├── encryption.ts       # libsodium field-level encryption
│       │   ├── tier-router.ts      # Route data to cloud vs local
│       │   └── key-management.ts   # OS keychain integration
│       └── package.json
│
├── local/                          # Local-only processing (never deployed)
│   ├── ollama-bridge/              # Tier 3 sensitive data → local LLM
│   └── reolink-watcher/            # Camera event detection
│
├── docs/
│   ├── decisions/                  # Architecture Decision Records
│   │   ├── 001-convex-over-supabase.md
│   │   ├── 002-mcp-server-architecture.md
│   │   └── ...
│   ├── integrations/               # Integration setup guides
│   └── self-hosting.md             # Self-hosting guide
│
├── docker/
│   └── docker-compose.yml          # Self-hosting: Convex + services
│
├── # ── Config ──
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml
├── turbo.json                      # Turborepo task definitions
├── biome.json                      # Linting + formatting (replaces ESLint + Prettier)
├── tsconfig.json                   # Root TypeScript config (strictest)
├── vitest.config.ts                # Test configuration
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Lint, type-check, test on every PR
│       └── deploy.yml              # Deploy Convex + web on merge to main
├── CLAUDE.md                       # AI coding instructions
├── .claudeignore
└── README.md
```

### Key Structural Decisions

| Decision | Rationale |
|----------|-----------|
| Tests next to source (`foo.test.ts`) | AI finds tests faster. No separate `__tests__` directory to navigate. |
| `convex/` is flat (not deeply nested) | Convex functions are the API surface. Flat = scannable. Sub-folders only for `lib/` and `actions/`. |
| `packages/integrations/` uses manifest pattern | Auto-discovery. New integration = new directory + PR. No core changes. |
| `local/` is separate from `convex/` | Local processing never touches the cloud. Physical separation prevents accidental exposure. |
| No `src/` in `convex/` | Convex convention. The `convex/` folder IS the source. |

---

## Convex Backend Architecture

### Schema Design Pattern

The `schema.ts` file is the single source of truth. All types flow from it.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const taskStatus = v.union(
  v.literal("inbox"),
  v.literal("backlog"),
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("done"),
  v.literal("archived"),
  v.literal("dropped"),
);

export const executability = v.union(
  v.literal("automated"),
  v.literal("ai_assisted"),
  v.literal("human_only"),
);

export const securityTier = v.union(
  v.literal(1),  // Public/work — cloud AI OK
  v.literal(2),  // Personal — cloud AI + encryption
  v.literal(3),  // Sensitive — local only
);

export const domain = v.union(
  v.literal("work"),
  v.literal("health"),
  v.literal("finance"),
  v.literal("home"),
  v.literal("personal"),
  v.literal("coding"),
);

export default defineSchema({
  tasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: taskStatus,
    priorityScore: v.float64(),
    impact: v.float64(),
    reach: v.float64(),
    confidence: v.float64(),
    effort: v.float64(),
    learnedWeight: v.float64(),
    domain: domain,
    tags: v.array(v.string()),
    dueDate: v.optional(v.float64()),
    workDate: v.optional(v.float64()),
    executability: executability,
    sourceIntegration: v.optional(v.string()),
    sourceId: v.optional(v.string()),
    escalationFlagged: v.boolean(),
    completedAt: v.optional(v.float64()),
  })
    .index("by_user_status", ["userId", "status"])
    .index("by_user_domain", ["userId", "domain"])
    .index("by_user_priority", ["userId", "priorityScore"])
    .index("by_escalation", ["userId", "escalationFlagged"]),

  memoryEpisodes: defineTable({
    userId: v.id("users"),
    source: v.string(),
    domain: domain,
    summary: v.string(),
    details: v.optional(v.any()), // JSONB equivalent
    learnings: v.array(v.string()),
    tags: v.array(v.string()),
    qualityScore: v.float64(),
    consolidated: v.boolean(),
    archived: v.boolean(),
    securityTier: securityTier,
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_user_consolidated", ["userId", "consolidated"])
    .index("by_user_source", ["userId", "source"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "domain"],
    }),

  memoryKnowledge: defineTable({
    userId: v.id("users"),
    topic: v.string(),
    category: v.string(),
    domain: v.optional(domain),
    content: v.string(),
    confidence: v.float64(),
    source: v.string(),
    verifiedCount: v.float64(),
    refutedCount: v.float64(),
    lastAccessedAt: v.optional(v.float64()),
    embedding: v.optional(v.array(v.float64())),
  })
    .index("by_user_category", ["userId", "category"])
    .index("by_user_confidence", ["userId", "confidence"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "domain"],
    }),

  // ... additional tables follow same pattern
});
```

### Query/Mutation Pattern

Every Convex function follows this exact structure:

```typescript
// convex/tasks.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { taskStatus, domain, executability } from "./schema";
import { getAuthUserId } from "./auth";
import { calculatePriorityScore } from "./lib/scoring";

/**
 * List tasks for the authenticated user, filtered by status and domain.
 */
export const list = query({
  args: {
    status: v.optional(taskStatus),
    domain: v.optional(domain),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args): Promise<TaskWithMeta[]> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const limit = args.limit ?? 50;

    let tasksQuery = ctx.db
      .query("tasks")
      .withIndex("by_user_status", (q) => {
        const base = q.eq("userId", userId);
        return args.status !== undefined ? base.eq("status", args.status) : base;
      });

    const tasks = await tasksQuery.order("desc").take(limit);

    return tasks.map((task) => ({
      ...task,
      priorityScore: calculatePriorityScore(task),
    }));
  },
});

/**
 * Create a new task for the authenticated user.
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    domain: domain,
    tags: v.optional(v.array(v.string())),
    dueDate: v.optional(v.float64()),
    workDate: v.optional(v.float64()),
    impact: v.optional(v.float64()),
    effort: v.optional(v.float64()),
  },
  handler: async (ctx, args): Promise<Id<"tasks">> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Authentication required");
    }

    return await ctx.db.insert("tasks", {
      userId,
      title: args.title,
      description: args.description,
      status: "inbox",
      priorityScore: 0,
      impact: args.impact ?? 5,
      reach: 0.5,
      confidence: 0.5,
      effort: args.effort ?? 1,
      learnedWeight: 1.0,
      domain: args.domain,
      tags: args.tags ?? [],
      dueDate: args.dueDate,
      workDate: args.workDate,
      executability: "human_only",
      escalationFlagged: false,
    });
  },
});
```

### Rules for Convex Functions

1. **Every query/mutation starts with auth check.** No exceptions.
2. **Args use Convex validators** — never trust client input.
3. **Handler has explicit return type** — even if TypeScript could infer it.
4. **One file per domain** — `tasks.ts`, `memory.ts`, `contacts.ts`. Not one file per function.
5. **Shared logic in `lib/`** — pure functions only, no DB access.
6. **Actions for external APIs** — anything that `fetch`es goes in `convex/actions/`.
7. **JSDoc on every export** — AI and contributors need to understand intent.

---

## Type System & Schema Design

### Rule: Types flow DOWN from schema, never UP

```
convex/schema.ts (SOURCE OF TRUTH)
    ↓ generates
convex/_generated/dataModel.d.ts (AUTO-GENERATED)
    ↓ imported by
convex/tasks.ts (BACKEND — uses Doc<"tasks">, Id<"tasks">)
    ↓ return types inferred by
apps/web/src/ (FRONTEND — useQuery return type is auto-inferred)
    ↓ same types available in
apps/mcp-server/src/ (MCP — uses ConvexClient, same types)
```

**Never manually define a type that mirrors a schema table.** Use `Doc<"tasks">` or derive from query return types.

### Shared validators

Extract validators used in multiple places:

```typescript
// convex/lib/validators.ts
import { v } from "convex/values";

/** Pagination args reused across list queries */
export const paginationArgs = {
  limit: v.optional(v.float64()),
  cursor: v.optional(v.string()),
};

/** Standard timestamp range filter */
export const dateRangeArgs = {
  since: v.optional(v.float64()),
  until: v.optional(v.float64()),
};
```

---

## Coding Standards

### TypeScript Configuration (strictest possible)

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitOverride": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

### Biome Configuration (replaces ESLint + Prettier)

```jsonc
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": { "level": "error", "options": { "maxAllowedComplexity": 15 } },
        "noForEach": "error",
        "useFlatMap": "error"
      },
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "error"
      },
      "performance": {
        "noAccumulatingSpread": "error",
        "noDelete": "error"
      },
      "security": {
        "noDangerouslySetInnerHtml": "error",
        "noGlobalEval": "error"
      },
      "style": {
        "noNonNullAssertion": "error",
        "useConst": "error",
        "useExportType": "error",
        "useImportType": "error",
        "useTemplate": "error",
        "noParameterAssign": "error"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noConsoleLog": "error",
        "noConfusingVoidType": "error",
        "noImplicitAnyLet": "error"
      }
    }
  }
}
```

### Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | kebab-case | `priority-scoring.ts` |
| Functions | camelCase | `calculatePriorityScore` |
| Types/Interfaces | PascalCase | `TaskWithMeta` |
| Constants | UPPER_SNAKE_CASE | `MAX_EPISODES_PER_CONSOLIDATION` |
| Convex tables | camelCase | `memoryEpisodes` |
| Convex functions | camelCase | `tasks.create`, `memory.recall` |
| React components | PascalCase | `TaskCard.tsx` |
| Test files | `*.test.ts` next to source | `tasks.test.ts` |
| Integration dirs | kebab-case | `packages/integrations/google-calendar/` |

---

## AI Coding Workflow

### How AI tools should work on this codebase

```
1. AI receives task (via user prompt or issue)
2. AI reads CLAUDE.md for rules and context
3. AI reads relevant convex/*.ts files to understand current state
4. AI writes/modifies code following patterns in existing files
5. AI runs: biome check + tsc + vitest (pre-commit validation)
6. AI fixes any errors
7. AI commits with conventional commit message
```

### Context files AI should always read

| File | Purpose | When |
|------|---------|------|
| `CLAUDE.md` | Rules, banned patterns, required patterns | Every session |
| `convex/schema.ts` | Data model (source of truth) | Any backend work |
| `convex/lib/constants.ts` | Enums, config values | Any backend work |
| `biome.json` | Linting rules | If lint errors |
| Relevant `*.test.ts` | Expected behavior | Before modifying function |

### Pattern: Test-Defined Development (TDD for AI)

Instead of describing what to build in prose, write the test first:

```typescript
// convex/tasks.test.ts
describe("tasks.create", () => {
  it("creates a task with default values", async () => {
    const id = await ctx.mutation(api.tasks.create, {
      title: "Buy groceries",
      domain: "personal",
    });
    const task = await ctx.query(api.tasks.get, { id });
    expect(task.status).toBe("inbox");
    expect(task.priorityScore).toBe(0);
    expect(task.executability).toBe("human_only");
    expect(task.escalationFlagged).toBe(false);
  });

  it("rejects unauthenticated users", async () => {
    await expect(
      unauthCtx.mutation(api.tasks.create, {
        title: "Should fail",
        domain: "work",
      })
    ).rejects.toThrow("Authentication required");
  });
});
```

Then tell AI: "Implement `tasks.create` to pass these tests."

This gives AI:
- Clear expected behavior
- Edge cases already defined
- Verification built-in

---

## Testing Strategy

### Test Pyramid

```
                    ┌───────────┐
                    │   E2E     │  5% — Critical user flows only
                    │ Playwright│
                ┌───┴───────────┴───┐
                │   Integration     │  25% — Convex function tests
                │ convex-test       │  (real Convex, real validators)
            ┌───┴───────────────────┴───┐
            │       Unit Tests          │  70% — Pure functions
            │   vitest (lib/, utils)    │  (scoring, encryption, parsing)
            └───────────────────────────┘
```

### Convex Function Testing

Use `convex-test` for testing queries/mutations against a real Convex backend:

```typescript
// convex/memory.test.ts
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

describe("memory.recall", () => {
  it("returns relevant episodes via vector search", async () => {
    const t = convexTest(schema);

    // Seed test data
    await t.run(async (ctx) => {
      await ctx.db.insert("memoryEpisodes", {
        userId: testUserId,
        source: "gmail",
        domain: "work",
        summary: "Meeting with John about Q1 planning",
        learnings: ["John prefers morning meetings"],
        tags: ["meeting", "q1"],
        qualityScore: 0.8,
        consolidated: false,
        archived: false,
        securityTier: 1,
        embedding: mockEmbedding,
      });
    });

    const results = await t.query(api.memory.recall, {
      query: "Q1 planning with John",
      domain: "work",
      limit: 5,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].summary).toContain("John");
  });
});
```

### What MUST be tested

| Layer | What to test | Coverage target |
|-------|-------------|-----------------|
| `convex/lib/*.ts` | Pure functions (scoring, decay, encryption) | 95%+ |
| `convex/*.ts` | Every exported query/mutation | 90%+ |
| `convex/actions/*.ts` | Integration actions (with mocked APIs) | 80%+ |
| `packages/integrations/*/` | Adapter logic + action definitions | 80%+ |
| `apps/web/` | Critical user flows (E2E) | Key paths only |

### What does NOT need testing

- Convex's own framework behavior (they test it)
- Auto-generated types
- Simple pass-through functions with no logic
- Third-party library internals

---

## CI/CD Pipeline

### On Every PR

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile

      # 1. Format + lint (Biome)
      - run: pnpm biome check .

      # 2. Type check (TypeScript)
      - run: pnpm tsc --noEmit

      # 3. Convex type check
      - run: npx convex typecheck

      # 4. Unit + integration tests
      - run: pnpm vitest run --reporter=verbose

      # 5. Dependency audit
      - run: pnpm audit --audit-level=high

      # 6. License check
      - run: npx license-checker --failOn "GPL-3.0;AGPL-3.0" --excludePrivatePackages
```

### On Merge to Main

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile

      # Deploy Convex backend
      - run: npx convex deploy

      # Deploy web dashboard
      - run: pnpm --filter web build
      - run: # deploy to Vercel/Cloudflare Pages
```

### Pre-commit Hooks (local)

```bash
# .husky/pre-commit
pnpm biome check --error-on-warnings .
pnpm tsc --noEmit
pnpm vitest run --reporter=dot
npx convex typecheck
```

All four must pass. No `--no-verify` allowed. If a hook fails, the AI must fix the issue, not skip the hook.

---

## Error Handling

### Pattern: Typed errors with explicit handling

```typescript
// convex/lib/errors.ts
export class AuthenticationError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(field: string, reason: string) {
    super(`Invalid ${field}: ${reason}`);
    this.name = "ValidationError";
  }
}
```

### Rules

1. **Never catch and swallow** — always re-throw or handle explicitly.
2. **Never use `catch (e: any)`** — narrow the type.
3. **Convex validators handle input validation** — don't duplicate in handler logic.
4. **Auth errors throw immediately** — don't return null and check later.
5. **External API errors are wrapped** — give context about which integration failed.

---

## Security Architecture

### Three-Tier Processing

```typescript
// convex/lib/constants.ts
export const SECURITY_TIERS = {
  PUBLIC: 1,    // Work data — cloud AI OK
  PERSONAL: 2,  // Personal data — cloud AI + field encryption
  SENSITIVE: 3,  // Health/finance/cameras — local processing only
} as const;

// Every integration declares its tier in manifest.json
// Data tagged with tier 3 is NEVER sent to cloud AI APIs
```

### Auth Check Pattern

```typescript
// convex/auth.ts — helper used by ALL queries/mutations
export async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new AuthenticationError();
  }
  return userId;
}
```

### Field-Level Encryption

```typescript
// packages/security/src/encryption.ts
import { secretbox, randomBytes } from "tweetnacl";

export function encryptField(plaintext: string, key: Uint8Array): string {
  const nonce = randomBytes(secretbox.nonceLength);
  const messageBytes = new TextEncoder().encode(plaintext);
  const encrypted = secretbox(messageBytes, nonce, key);
  // Return nonce + ciphertext as base64
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  return btoa(String.fromCharCode(...combined));
}

export function decryptField(ciphertext: string, key: Uint8Array): string {
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const nonce = combined.slice(0, secretbox.nonceLength);
  const message = combined.slice(secretbox.nonceLength);
  const decrypted = secretbox.open(message, nonce, key);
  if (decrypted === null) {
    throw new Error("Decryption failed");
  }
  return new TextDecoder().decode(decrypted);
}
```

---

## Integration Framework

### Manifest-Based Auto-Discovery

```jsonc
// packages/integrations/gmail/manifest.json
{
  "id": "gmail",
  "name": "Gmail",
  "description": "Multi-account email with search, send, and inbox triage",
  "version": "1.0.0",
  "author": "core",
  "securityTier": 2,
  "authType": "oauth2",
  "capabilities": ["sync", "webhook", "execute"],
  "actions": [
    {
      "name": "send_email",
      "description": "Send an email from a connected account",
      "executability": "ai_assisted",
      "params": {
        "to": { "type": "string", "required": true },
        "subject": { "type": "string", "required": true },
        "body": { "type": "string", "required": true },
        "account": { "type": "string", "required": false }
      }
    },
    {
      "name": "search_inbox",
      "description": "Search emails across all connected accounts",
      "executability": "automated",
      "params": {
        "query": { "type": "string", "required": true },
        "limit": { "type": "number", "required": false }
      }
    }
  ],
  "dataTypes": ["email", "contact"]
}
```

### How integrations connect to Convex

Integration adapters run as Convex **actions** (can call external APIs):

```typescript
// convex/actions/gmail.ts
"use node";  // Required for Node.js APIs

import { action } from "../_generated/server";
import { v } from "convex/values";
import { GmailAdapter } from "../../packages/integrations/gmail/adapter";

export const syncInbox = action({
  args: {
    since: v.float64(),
  },
  handler: async (ctx, args): Promise<void> => {
    const userId = await requireAuth(ctx);
    const adapter = new GmailAdapter();
    const episodes = await adapter.sync(userId, new Date(args.since));

    // Store as episodes via internal mutation
    for (const episode of episodes) {
      await ctx.runMutation(internal.memory.createEpisode, episode);
    }
  },
});
```

---

## Memory & Learning System

### Recall Flow

```typescript
// convex/memory.ts

/**
 * Recall relevant memories for a given query.
 * Used before AI responses to inject context.
 */
export const recall = query({
  args: {
    query: v.string(),
    domain: v.optional(domain),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args): Promise<RecallResult> => {
    const userId = await requireAuth(ctx);
    const limit = args.limit ?? 10;

    // 1. Vector search on episodes
    const episodes = await ctx.vectorSearch("memoryEpisodes", "by_embedding", {
      vector: args.queryEmbedding, // pre-computed by caller
      limit,
      filter: (q) =>
        q.and(
          q.eq("userId", userId),
          args.domain !== undefined ? q.eq("domain", args.domain) : true,
        ),
    });

    // 2. Knowledge lookup
    const knowledge = await ctx.db
      .query("memoryKnowledge")
      .withIndex("by_user_confidence", (q) => q.eq("userId", userId))
      .order("desc")
      .filter((q) => q.gt(q.field("confidence"), 0.3))
      .take(5);

    // 3. Format for AI context injection
    return { episodes, knowledge };
  },
});
```

### Consolidation Cron

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily: consolidate episodes into knowledge
crons.daily("consolidate-memory", { hourUTC: 7 }, internal.memory.consolidateDaily);

// Weekly: review knowledge, apply decay
crons.weekly("review-knowledge", { dayOfWeek: "sunday", hourUTC: 20 }, internal.memory.reviewWeekly);

// Daily: generate morning digest
crons.daily("morning-digest", { hourUTC: 12 }, internal.analytics.generateDailyDigest);

// Hourly: recalculate priority scores
crons.interval("recalculate-priorities", { hours: 1 }, internal.tasks.recalculatePriorities);

export default crons;
```

---

## AGENTS.md / CLAUDE.md — Minimal Steering Only

> **Key insight (backed by study + practical testing):** Bloated instruction files increase cost 20%+, go stale, and duplicate info the model can already find by reading the codebase. Models are RL-trained to explore codebases — `ls`, `package.json`, `grep` — and they're good at it. A freshly-generated CLAUDE.md made tasks take 25% longer in testing.

### Philosophy

1. **Fix the codebase, not the instruction file.** If the model does something wrong, add a type, a test, or a lint rule — not a CLAUDE.md bullet point.
2. **AGENTS.md is a band-aid of last resort** for things that genuinely can't be encoded in code (privacy routing rules, destructive operation bans, legacy traps).
3. **If the model can find it by reading files, don't put it in AGENTS.md.** Folder structure, dependencies, framework patterns — the model reads `package.json` and the code.

### The entire AGENTS.md file

```markdown
# LifeOS Agent Notes

- Restricted health, finance, and camera raw data must stay local.
- Do not send restricted data to remote models.
- Do not write model output directly into durable user-facing tables.
- Use append-only ingest plus projectors for integrations.
- Do not target production Convex or production MCP by default.
- Do not run long-lived dev servers unless explicitly asked.
- If repo structure or behavior seems surprising, stop and report it instead of encoding a new rule blindly.
```

That's it. 7 lines. Everything else is enforced by types, Biome, tests, pre-commit hooks, and CI.

### What does NOT belong in instruction files

- Folder tours (model reads `ls`)
- Dependency lists (model reads `package.json`)
- Framework summaries (model reads the code)
- Generic TypeScript advice (enforced by `tsconfig.json` strict mode)
- Coding style rules (enforced by Biome)
- Test requirements (enforced by pre-commit hooks + CI)
- Architecture overview (lives in `docs/architecture/`)

### CLAUDE.md

Either a symlink to AGENTS.md or doesn't exist. Do not maintain two diverging instruction files.

---

## File & Function Size Limits

| Metric | Limit | Rationale |
|--------|-------|-----------|
| File length | 300 lines max | AI works better with small, focused files |
| Function length | 50 lines max | Forces single responsibility |
| Parameters | 3 max (then use object) | Reduces cognitive load |
| Nesting depth | 3 levels max | Early returns over deep nesting |
| Cyclomatic complexity | 15 max | Biome enforces this |
| Import count | ~15 max per file | Signals file is doing too much |

When a file approaches limits, split into:
- `tasks.ts` → `tasks.ts` (queries) + `tasks-mutations.ts` (mutations) + `lib/task-scoring.ts` (pure logic)

---

## Dependency Policy

### Rules

1. **Fewer deps = fewer problems.** Every dependency is attack surface and maintenance burden.
2. **No deps for things you can write in 20 lines.** Don't install `is-odd`.
3. **Pin exact versions** in `package.json` (no `^` or `~`). Renovate bot for updates.
4. **Audit on every CI run** (`pnpm audit --audit-level=high`).
5. **License check on every CI run.** No GPL-3.0 or AGPL-3.0 deps (we're AGPL ourselves, but deps shouldn't force incompatible terms).

### Approved dependencies

| Category | Package | Why |
|----------|---------|-----|
| Runtime | `convex` | Database + backend |
| Runtime | `@modelcontextprotocol/sdk` | MCP server |
| Runtime | `tweetnacl` | Encryption (minimal, audited) |
| Runtime | `react`, `react-dom` | UI framework |
| Frontend | `tailwindcss` | Styling |
| Frontend | `@tanstack/react-router` | Routing |
| Dev | `vitest` | Testing |
| Dev | `@biomejs/biome` | Linting + formatting |
| Dev | `typescript` | Type checking |
| Dev | `convex-test` | Convex function testing |
| Dev | `turbo` | Monorepo orchestration |

### Banned patterns

- No `lodash` (use native JS methods)
- No `moment` or `dayjs` (use `Intl.DateTimeFormat` + native `Date`)
- No `axios` (use native `fetch`)
- No `express` (Convex HTTP actions replace API servers)
- No ORMs (Convex replaces this)

---

## Documentation Standards

### Architecture Decision Records (ADRs)

Every non-obvious decision gets documented:

```markdown
# ADR-001: Convex over Supabase

## Status: Accepted
## Date: 2026-03-23

## Context
LifeOS is 100% AI-authored and will be open-sourced...

## Decision
Use Convex as the backend platform instead of Supabase.

## Consequences
- (+) Real-time sync by default
- (+) Infra as code — everything in convex/ folder
- (+) Better for AI coding tools
- (-) Less mature than PostgreSQL ecosystem
- (-) Analytics queries must be streamed to external system
```

### Code Comments

- **DO** add JSDoc to every exported function
- **DO** add `// Why:` comments for non-obvious decisions
- **DON'T** add comments that repeat the code
- **DON'T** add `// TODO` without a linked issue

---

## Git & Branching Strategy

### Branch naming

```
feat/task-priority-scoring
fix/memory-recall-auth-check
refactor/split-tasks-file
docs/adr-003-encryption-strategy
```

### Commit messages (conventional commits)

```
feat(tasks): add priority scoring with RICE formula
fix(memory): check auth before vector search
refactor(schema): extract shared validators to lib
test(contacts): add neglected contacts query tests
docs: add ADR-003 encryption strategy
chore: update convex to 1.18.0
```

### Merge strategy

- All changes via PR (even for solo dev — creates audit trail)
- Squash merge to main (clean history)
- CI must pass before merge
- Auto-deploy on merge to main

---

## Recommended Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACES                              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Web Dashboard │  │  MCP Server  │  │     CLI      │             │
│  │ (Vite+React)  │  │ (any AI can  │  │ (quick cmds) │             │
│  │ useQuery()    │  │  connect)    │  │              │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                  │                     │
│         │  Convex React    │  Convex Node     │  Convex Node       │
│         │  SDK             │  SDK             │  SDK               │
└─────────┼──────────────────┼──────────────────┼─────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CONVEX BACKEND                                  │
│                     (convex/ folder)                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────┐               │
│  │              Queries & Mutations                 │               │
│  │  tasks.ts │ memory.ts │ contacts.ts │ coding.ts │               │
│  │  analytics.ts │ feedback.ts                     │               │
│  └──────────────────────┬──────────────────────────┘               │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────┐               │
│  │              Schema + Validators                 │               │
│  │         schema.ts (source of truth)              │               │
│  │    Vector indexes │ Regular indexes              │               │
│  └──────────────────────┬──────────────────────────┘               │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────┐               │
│  │         Actions (External API calls)             │               │
│  │  actions/gmail.ts │ actions/slack.ts │ etc.      │               │
│  └──────────────────────┬──────────────────────────┘               │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────┐               │
│  │         Crons (Scheduled Tasks)                  │               │
│  │  Consolidation │ Decay │ Digests │ Recalc        │               │
│  └──────────────────────┬──────────────────────────┘               │
│                         │                                           │
│  ┌──────────────────────▼──────────────────────────┐               │
│  │         HTTP Routes (Webhooks)                   │               │
│  │  POST /webhooks/gmail │ /webhooks/github │ etc.  │               │
│  └─────────────────────────────────────────────────┘               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
          │
          │  Stream data out (for analytics)
          ▼
┌─────────────────────┐     ┌─────────────────────┐
│ ClickHouse / PostHog│     │   Local Processing  │
│ (Wrapped reports,   │     │   (Tier 3 data)     │
│  heavy analytics)   │     │   Ollama + SQLite   │
└─────────────────────┘     │   Health, cameras,  │
                            │   finance           │
                            └─────────────────────┘
```

---

## Summary: What Makes This AI-Optimized

| Principle | How It Helps AI |
|-----------|----------------|
| Small files (<300 lines) | Fits in context window, less confusion |
| Explicit return types | AI knows exactly what to produce |
| Tests as specs | AI has clear success criteria |
| Single source of truth (schema.ts) | No conflicting type definitions |
| Flat convex/ structure | Easy to navigate, no deep nesting |
| Manifest-based integrations | Pattern is repeatable, AI can scaffold |
| Biome (single tool) | One config, fast feedback loop |
| Conventional commits | AI produces consistent, parseable history |
| Minimal AGENTS.md (7 lines) | Only rules that can't be encoded in code |
| Pre-commit hooks | Catch AI mistakes immediately |
| Infra as code | AI changes files, not dashboards |
| No ORMs or SQL | AI writes TypeScript, not query languages |

---

*This document should be given to any AI coding tool (Claude Code, Codex, Cursor, etc.) before they begin working on LifeOS. It defines not just what to build, but how to build it in a way that produces OSS-quality code.*
