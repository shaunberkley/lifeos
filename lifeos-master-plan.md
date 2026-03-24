# Personal AI Life OS — Comprehensive Plan

> **Decisions confirmed:** Build from scratch (borrow patterns from Bob + OpenClaw). Repo at `~/dev/`. Apple Silicon 16GB+ (Ollama viable). All domains prioritized (work, personal, health, home). Name TBD.

## Context

Shaun works across multiple companies/projects and is overwhelmed by the volume of emails, meetings, Slack messages, GitHub activity, personal health data, home monitoring, finances, and relationship management. AI has the capability to help enormously, but the barriers are: (1) connecting all the data sources, (2) building a system that truly learns what matters vs what doesn't, and (3) keeping tasks/context relevant over time without manual grooming.

The goal is to build a **personal AI assistant platform** — Shaun is the first user, but it's architected as a multi-tenant platform from day one for potential open-source or product release.

---

## Competitive Landscape Summary

### The Market Gap

**Nobody is doing the full life OS well.** The market is fragmented:
- **Work-only tools** (Motion, Lindy, Granola, Notion AI) — strong but narrow
- **Knowledge-only tools** (Mem.ai, Khoj, Quivr) — good memory, limited action
- **Failed "everything" attempts** (Dot.ai shut down, Rewind acquired by Meta, Apple Intelligence delayed 2+ years)
- **Big Tech walled gardens** (Gemini, Copilot, Siri) — locked to their ecosystem

**Key insight from failures:** Companies that tried to do everything at once died. Those that nailed one domain and expanded survived (Motion: scheduling → AI employees; Granola: meeting notes → team collaboration).

### Open Source Landscape

| Project | Stars | Strength | Weakness for Our Use Case |
|---------|-------|----------|---------------------------|
| **OpenClaw** | 332k+ | 50+ channel integrations, 13k+ skills, local-first | No MCP, SQLite-only, single-user, no cloud platform |
| **Khoj** | 33k+ | RAG-based knowledge, multi-model | No task management, no life domains |
| **Letta/MemGPT** | Active | Best memory architecture research | Framework only, not a product |
| **Charlie Mnemonic** | Moderate | True learning from interactions | Small project, limited integrations |
| **memUBot** | Enterprise | 3-layer memory (resource→item→category) | PostgreSQL-heavy, enterprise-focused |

### Table.ai — Key Competitor for Personal CRM

Table (usetable.ai) is the closest competitor for the "personal CRM" slice of what we're building. Still in private beta (Q1 2026 launch, 5k+ waitlist).

**What they do well:**
- AI-first personal CRM — contacts auto-flow in from integrations
- Data enrichment (LinkedIn jobs, public emails/phones, social activity monitoring)
- AI meeting notes with transcription + action items
- Proactive network monitoring (news about your contacts on LinkedIn/X)
- Natural language commands: "remind me to follow up with John", "write an intro email"
- Multi-model (OpenAI + Mistral + Llama)
- Clean UX with keyboard shortcuts, free tier

**Current integrations:** Gmail, Google Calendar, Google Contacts, LinkedIn, iMessage. Coming soon: X, Apple Mail, WhatsApp, Outlook, Slack.

**What they DON'T do (our advantage):**
- No health tracking, home monitoring, finance, or coding session tracking
- No task management / kanban / priority scoring
- No self-learning with decay (no memory consolidation system)
- No security tiering (local processing for sensitive data)
- No open-source option
- Single-purpose (CRM only, not a life OS)
- No MCP protocol (locked to their own interface)

**Takeaway:** Table is a beautifully designed personal CRM, but it's ONE feature of our broader platform. We should match their CRM quality (data enrichment, proactive reminders, contact context) and surpass it by connecting relationship data to every other life domain.

### Our Positioning

Build what nobody has: **an open-core, model-agnostic life OS that connects ALL domains (work + personal + health + home + finance) with a self-learning memory system, self-hostable or managed.**

Key differentiators:
1. **MCP-native** — any AI client can be the "brain" (Claude, GPT, local Ollama)
2. **Self-learning with decay** — system learns relevance, not just stores data
3. **Security-tiered** — sensitive data (health, cameras, finance) processed locally only
4. **Open-core** — self-host for free, managed hosting for convenience
5. **AI coding session tracking** — captures all Claude Code/Codex work automatically
6. **Full life OS** — not just CRM or just tasks, but everything connected
7. **Dynamic integration framework** — community can add integrations that "just work"

> **Domain note:** lifeos.com is available for $2,000. Strong branding fit.

---

## Architecture Decision: MCP Server + CLI Hybrid

**Recommendation: Build as an MCP server that also exposes a CLI and REST API.**

Why MCP server (not just CLI):
- Any MCP-compatible client becomes the interface (Claude Desktop, Claude Code, custom apps)
- Model-agnostic by design — the "brain" is whatever connects
- Standardized protocol (JSON-RPC 2.0) with growing ecosystem
- Supports both local (stdio) and remote (HTTP/SSE) transports

Why also CLI:
- Quick interactions without opening a full AI client
- Scripting and automation
- Cron job integration

Why also REST API:
- Web dashboard (kanban, reports, Spotify Wrapped)
- Mobile app (future)
- Webhook receivers for integrations

```
                    ┌─────────────────────────────────────┐
                    │         AI Clients (Brain)           │
                    │  Claude Desktop │ Claude Code │ GPT  │
                    │  Ollama (local) │ Custom App         │
                    └────────┬───────────────┬────────────┘
                             │  MCP Protocol │
                    ┌────────▼───────────────▼────────────┐
                    │        LIFE OS MCP SERVER              │
                    │  ┌──────────┐ ┌──────────────────┐  │
                    │  │  Tools   │ │   Resources      │  │
                    │  │ (actions)│ │ (data access)    │  │
                    │  └────┬─────┘ └───────┬──────────┘  │
                    │       │               │              │
                    │  ┌────▼───────────────▼──────────┐  │
                    │  │    Core Engine                 │  │
                    │  │  ┌─────────┐ ┌─────────────┐  │  │
                    │  │  │ Memory  │ │ Task Mgmt   │  │  │
                    │  │  │ System  │ │ + Scoring    │  │  │
                    │  │  └─────────┘ └─────────────┘  │  │
                    │  │  ┌─────────┐ ┌─────────────┐  │  │
                    │  │  │Learning │ │ Integration  │  │  │
                    │  │  │ Engine  │ │ Adapters     │  │  │
                    │  │  └─────────┘ └─────────────┘  │  │
                    │  └───────────────┬───────────────┘  │
                    └─────────────────┼───────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
    ┌─────────▼──────────┐  ┌────────▼─────────┐  ┌─────────▼─────────┐
    │  Supabase (Primary)│  │ Cloudflare Edge  │  │ Local Processing  │
    │  PostgreSQL+pgvec  │  │ Workers + Queues │  │ Ollama + SQLite   │
    │  RLS, encryption   │  │ Webhooks, crons  │  │ Health, cameras,  │
    │  All user data     │  │ Event routing    │  │ finance           │
    └────────────────────┘  └──────────────────┘  └───────────────────┘
```

---

## Code Quality Guardrails (Going Beyond DriveClub)

> **Philosophy:** 100% AI-written code under OSS scrutiny. Zero exceptions, zero tech debt from day one. DriveClub has ~10 exception blocks relaxing ESLint rules across apps — LifeOS will have ZERO. Every rule is `error`, never `warn`.

### What DriveClub does well (we keep)
- Zero `any`, zero `@ts-ignore`, zero `@ts-expect-error`
- `noUncheckedIndexedAccess` enabled
- Explicit return types on all functions
- `strict-boolean-expressions` (no truthy checks)
- `no-floating-promises` (every promise awaited or voided)
- Consistent type imports (`type` keyword)
- No `console.log` in production code
- No `eval`, no `new Function`
- Bob's episodic memory + self-learning pattern

### What we do BEYOND DriveClub

**1. Zero exceptions from day one**
DriveClub has `warn` rules across 7 apps because legacy code predates the rules. LifeOS is greenfield — every rule is `error` everywhere. No `// TODO: Fix in follow-up PR` exceptions.

**2. Biome instead of ESLint** (faster, stricter, unified)
- Biome handles linting + formatting in one tool (replaces ESLint + Prettier)
- 100x faster than ESLint
- Stricter defaults, less configuration drift
- Better AI compatibility (single config file)

**3. Pre-commit hooks that block merges**
```
pre-commit:
  1. biome check --error-on-warnings (lint + format)
  2. tsc --noEmit (type check)
  3. vitest run --reporter=verbose (tests must pass)
  4. convex typecheck (schema + query type safety)
```
If ANY step fails, commit is rejected. No `--no-verify` allowed.

**4. AI-specific guardrails in CLAUDE.md**
```markdown
# LifeOS CLAUDE.md Rules

## Non-Negotiable
- ZERO `any` types — fix the type properly
- ZERO `@ts-ignore` or `@ts-expect-error`
- ZERO `as` type assertions unless provably safe (document why)
- ALL functions have explicit return types
- ALL errors are typed (never catch unknown without narrowing)
- ALL async functions properly handle errors
- NO hardcoded strings for enum values (use const objects)
- NO magic numbers (use named constants)
- NO nested ternaries
- NO files over 300 lines (split into modules)
- NO functions over 50 lines (extract helpers)
- NO more than 3 parameters (use options objects)
- EVERY public function has a JSDoc description

## Convex-Specific
- ALL queries check auth before accessing data
- ALL mutations validate inputs (Convex validators)
- NEVER expose internal IDs to clients without purpose
- ALL vector search queries have relevance score thresholds

## Testing
- EVERY query/mutation has at least one test
- Test files live next to source: `tasks.ts` → `tasks.test.ts`
- Integration adapters have mock + real API tests
- Memory system has consolidation correctness tests
```

**5. Automated code review via CI**
- `biome check` on every PR
- Type coverage tracking (must stay above 98%)
- Bundle size monitoring
- Dependency audit (no known vulnerabilities)
- License check (all deps must be OSS-compatible)

**6. Architecture Decision Records (ADRs)**
Every significant decision gets a markdown file in `docs/decisions/`:
```
docs/decisions/
├── 001-convex-over-supabase.md
├── 002-mcp-server-architecture.md
├── 003-memory-consolidation-algorithm.md
└── ...
```
This ensures future contributors (and AI) understand WHY decisions were made.

---

## Build vs Fork Decision

**Recommendation: Build from scratch, borrow patterns from Bob + OpenClaw.**

Why not fork OpenClaw:
- Local-first/SQLite only — we need cloud-first for platform
- No MCP support — we need MCP-native
- Single-user architecture — we need multi-tenant
- Would require gutting most of the architecture to retrofit

What to borrow from OpenClaw:
- Channel adapter patterns (how they support 50+ integrations)
- Skill directory structure (SKILL.md with YAML frontmatter)
- "Search first, then inject" memory recall pattern

What to borrow from Bob:
- Episodic → Knowledge → Pattern memory hierarchy
- Confidence scoring with decay
- Self-healing error recovery tiers
- Cloudflare Workers + Fly.io serverless pattern
- Episode extraction via sentinel markers

What to borrow from Letta/MemGPT:
- Self-editing memory (agent manages its own memory via tools)
- Core memory + recall memory + archival memory tiers

---

## Project Structure (TypeScript Monorepo)

```
<tbd>/                              # ~/dev/<tbd>/
├── apps/
│   ├── web/                    # Dashboard (Next.js) — kanban, reports, settings
│   ├── mcp-server/             # MCP server (stdio + HTTP transport)
│   └── cli/                    # CLI for quick interactions
├── packages/
│   ├── core/                   # Core engine (memory, tasks, learning, scoring)
│   ├── database/               # Supabase schema + Drizzle ORM + migrations
│   ├── integrations/           # Pluggable integration adapters
│   │   ├── gmail/
│   │   ├── google-calendar/
│   │   ├── slack/
│   │   ├── github/
│   │   ├── fireflies/
│   │   ├── claude-code/        # Session tracking hook + MCP
│   │   ├── codex/              # OpenAI Codex tracking
│   │   ├── oura/
│   │   ├── snapcalorie/
│   │   ├── apple-health/
│   │   ├── reolink/
│   │   └── plaid/
│   ├── security/               # Encryption, key management, tier routing
│   ├── analytics/              # Reports, Wrapped, aggregation queries
│   └── shared/                 # Types, constants, utilities
├── workers/
│   ├── webhook-receiver/       # Cloudflare Worker — ingest events
│   ├── queue-processor/        # Cloudflare Worker — process queue
│   └── cron/                   # Scheduled tasks (consolidation, reports, decay)
├── local/
│   ├── ollama-bridge/          # Local LLM processing for sensitive data
│   └── reolink-watcher/        # Local camera event processing
├── supabase/
│   └── migrations/             # Database migrations
└── tools/
    └── setup/                  # Onboarding scripts, integration setup wizards
```

---

## Database Schema (Convex)

### Core Tables

```sql
-- Users (multi-tenant from day one)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  encryption_key_hash TEXT,          -- Verify user's master key
  settings JSONB DEFAULT '{}',       -- Preferences, notification prefs
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Integration connections per user
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  provider TEXT NOT NULL,            -- 'gmail', 'slack', 'github', 'oura', etc.
  credentials_encrypted TEXT,        -- Field-level encrypted OAuth tokens
  config JSONB DEFAULT '{}',         -- Provider-specific settings
  status TEXT DEFAULT 'active',      -- active, paused, error
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks (kanban + priority scoring)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'inbox',       -- inbox, backlog, todo, in_progress, done, archived
  priority_score REAL DEFAULT 0,     -- Computed: RICE * decay * learned_weight
  impact INTEGER DEFAULT 5,          -- 1-10
  reach REAL DEFAULT 0.5,            -- 0-1
  confidence REAL DEFAULT 0.5,       -- 0-1
  effort INTEGER DEFAULT 1,          -- Hours estimate
  learned_weight REAL DEFAULT 1.0,   -- Adjusted by user feedback (0.5-2.0)
  domain TEXT,                       -- work, health, finance, home, personal, coding
  tags TEXT[] DEFAULT '{}',
  due_date DATE,
  work_date DATE,                    -- When to work on it
  recurrence JSONB,                  -- Recurring task config
  executability TEXT DEFAULT 'human_only', -- automated, ai_assisted, human_only
  source_integration TEXT,           -- Which integration created it
  source_id TEXT,                    -- External ID (issue #, email ID, etc.)
  escalation_flagged BOOLEAN DEFAULT false,  -- True if important + decaying
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Episodic memory (raw events/interactions)
CREATE TABLE memory_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  source TEXT NOT NULL,              -- 'gmail', 'slack', 'claude_code', 'manual', etc.
  domain TEXT,                       -- work, health, finance, home, personal, coding
  summary TEXT NOT NULL,
  details JSONB,                     -- Source-specific structured data
  learnings TEXT[],                  -- What was learned from this
  tags TEXT[] DEFAULT '{}',
  quality_score REAL DEFAULT 0.5,    -- 0-1
  embedding vector(1536),           -- pgvector for semantic search
  consolidated BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  security_tier INTEGER DEFAULT 1,   -- 1=public, 2=personal, 3=sensitive
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Consolidated knowledge (patterns distilled from episodes)
CREATE TABLE memory_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  topic TEXT NOT NULL,
  category TEXT NOT NULL,            -- preference, pattern, behavioral_rule, contact_info, etc.
  domain TEXT,
  content TEXT NOT NULL,
  confidence REAL DEFAULT 0.5,       -- Decays over time, boosted by verification
  embedding vector(1536),
  source TEXT,                       -- 'consolidation', 'user_explicit', 'feedback'
  verified_count INTEGER DEFAULT 0,
  refuted_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User feedback for learning
CREATE TABLE feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  target_type TEXT NOT NULL,         -- 'task', 'episode', 'knowledge', 'suggestion'
  target_id UUID,
  feedback_type TEXT NOT NULL,       -- 'thumbs_up', 'thumbs_down', 'not_relevant', 'correction'
  context JSONB,                     -- What the system showed, why user disagreed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Coding sessions (Claude Code / Codex tracking)
CREATE TABLE coding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tool TEXT NOT NULL,                -- 'claude_code', 'codex', 'cursor', etc.
  project_path TEXT,
  branch TEXT,
  session_summary TEXT,
  files_changed TEXT[],
  tools_used JSONB,                  -- {tool_name: count}
  tokens_used INTEGER,
  cost_usd REAL,
  duration_ms INTEGER,
  commit_hashes TEXT[],              -- Correlated git commits
  transcript_ref TEXT,               -- Reference to stored transcript (S3/R2)
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- People/contacts (relationship management)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  relationship TEXT,                 -- family, friend, colleague, etc.
  birthday DATE,
  notes_encrypted TEXT,              -- Field-level encrypted
  last_interaction_at TIMESTAMPTZ,
  interaction_frequency_days INTEGER, -- Desired cadence
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics snapshots (for Wrapped-style reports)
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  period_type TEXT NOT NULL,         -- 'daily', 'weekly', 'monthly', 'yearly'
  period_start DATE NOT NULL,
  metrics JSONB NOT NULL,            -- Aggregated stats
  insights JSONB,                    -- AI-generated insights
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security
```sql
-- Every table gets RLS: users can only access their own data
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_tasks" ON tasks
  USING (user_id = auth.uid());
-- (repeat for all tables)
```

---

## Memory System Design

### Three-Tier Memory (Extending Bob's Model)

```
Tier 1: EPISODIC MEMORY (immediate)
├── Every interaction stored as an episode
├── Embedding generated for semantic search
├── Available for recall immediately
├── Sources: emails, messages, meetings, coding sessions, manual input
└── Retention: 30 days full, then archived (summary preserved)

Tier 2: CONSOLIDATED KNOWLEDGE (daily)
├── Daily cron extracts patterns from unconsolidated episodes
├── Categories: preferences, patterns, behavioral_rules, contact_info, schedules
├── Confidence score starts at 0.5, adjusted by verification
├── Weekly decay: -0.05 if not accessed (min 0.1)
├── Boost: +0.1 on verified success, -0.15 on refuted
└── Retention: permanent (with confidence tracking)

Tier 3: DETECTED PATTERNS (weekly)
├── Cross-domain pattern analysis
├── "You're most productive on Tuesdays"
├── "Emails from X are always low priority"
├── "Health tasks correlate with exercise days"
├── Severity levels for actionable patterns
└── Feed into task scoring and proactive suggestions
```

### Recall Flow (Before Any AI Response)

```
User asks question / Event triggers action
    │
    ├─ Extract search cues (entities, concepts, domain)
    │
    ├─ Semantic search: pgvector similarity on episodes (top 10)
    │
    ├─ Knowledge lookup: category + domain filter (top 5)
    │
    ├─ Behavioral rules: active rules with confidence > 0.3
    │
    ├─ Recent feedback: last 5 "not relevant" markers (to avoid)
    │
    └─ Format as context → inject into AI prompt
```

### Learning from "Not Relevant" Feedback

No ML training needed. The LLM + statistical feedback loop handles this:

1. User marks email/task as "not relevant" → `feedback_events` row created
2. System extracts features: sender, domain, keywords, time of day
3. Next consolidation: LLM analyzes feedback patterns → creates/updates `behavioral_rule`
   - Example: "Emails from marketing@company.com about weekly newsletters → not relevant"
4. Rule gets confidence score, tested on future items
5. If rule causes user to override (marks something relevant that rule filtered) → confidence drops

This is **in-context learning** not ML — the LLM pattern-matches on stored rules, no model training needed.

---

## Task Management System

### Priority Scoring

```
priority_score = (impact × reach × confidence / effort) × time_decay × learned_weight

Where:
  impact (1-10):     How much this matters
  reach (0-1):       How many life areas affected
  confidence (0-1):  How sure we are about impact
  effort (1-100):    Hours estimated
  time_decay:        e^(-days_since_created / half_life)
                     half_life varies by domain:
                       work: 14 days
                       health: 7 days
                       finance: 30 days (tax deadlines don't decay fast)
                       personal: 21 days
  learned_weight:    0.5-2.0, adjusted by user feedback
```

### Importance Escalation (Critical Feature)

When a task with `impact >= 7` starts decaying past 50% of its original score:
1. Flag `escalation_flagged = true`
2. Surface in daily digest: "These important items are going stale"
3. Ask user: "Should I reprioritize, snooze, or drop this?"
4. User response feeds back into `learned_weight`

### Kanban States

```
inbox → backlog → todo → in_progress → done → archived
                                    ↘ dropped (explicit removal, feeds learning)
```

### Tags & Domains

- **Domains**: work, health, finance, home, personal, coding
- **Tags**: user-defined, auto-suggested by LLM based on content
- **Sources**: auto-tagged by integration origin (gmail, slack, github, etc.)

### AI-Automated vs Human-Required Tasks

Every task gets classified by **executability**:

```
┌─────────────────────────────────────────────────────────────────┐
│ FULLY AUTOMATED (AI does it, user gets notified)                │
├─────────────────────────────────────────────────────────────────┤
│ • Send follow-up emails (using learned tone/style)              │
│ • Schedule meetings (calendar + availability check)             │
│ • File/categorize expenses for taxes                            │
│ • Generate daily/weekly reports                                 │
│ • Data enrichment on new contacts                               │
│ • Memory consolidation + pattern detection                      │
│ • Birthday/anniversary reminders                                │
│ • Sync data across integrations                                 │
│ • Triage inbox (flag important, archive noise)                  │
│ • Create GitHub issues from Slack conversations                 │
│ • Summarize meeting notes + extract action items                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AI-ASSISTED (AI prepares, human approves/executes)              │
├─────────────────────────────────────────────────────────────────┤
│ • Draft important emails (AI writes, user sends)                │
│ • Propose task reprioritization (user confirms)                 │
│ • Suggest people to reach out to (user decides)                 │
│ • Financial decisions (AI categorizes, user verifies)           │
│ • PR reviews (AI drafts review, user submits)                   │
│ • Health recommendations (AI notices pattern, user acts)        │
│ • Gift suggestions for birthdays                                │
│ • Meeting prep briefs (AI generates, user reviews)              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HUMAN-ONLY (AI reminds/tracks, human must do it)                │
├─────────────────────────────────────────────────────────────────┤
│ • Take out trashcans                                            │
│ • Physical chores (cleaning, laundry, yard work)                │
│ • In-person meetings / calls                                    │
│ • Exercise / workouts                                           │
│ • Doctor appointments                                           │
│ • Pick up kids / school events                                  │
│ • Home repairs / maintenance                                    │
│ • Grocery shopping                                              │
│ • Sign legal/financial documents                                │
└─────────────────────────────────────────────────────────────────┘
```

**DB column:** `executability` enum: `automated`, `ai_assisted`, `human_only`
- AI auto-classifies based on task content + domain
- User can override (feeds learning: "no, I want to write this email myself")
- Automated tasks run without prompting; AI-assisted tasks queue for approval

---

## Integration Architecture (Dynamic Framework)

### Dynamic Adapter Framework

> **Goal:** Adding a new integration should be as simple as creating a directory with a manifest + adapter file. The system auto-discovers and registers it. Community contributors can submit integrations via PR.

Each integration lives in `packages/integrations/<name>/` with:

```
packages/integrations/gmail/
├── manifest.json          # Metadata, capabilities, auth type, security tier
├── adapter.ts             # Implements IntegrationAdapter interface
├── actions.ts             # Named actions this integration can perform
├── webhooks.ts            # Optional: webhook handler
└── README.md              # Setup instructions
```

**manifest.json** (auto-discovered by the system):
```json
{
  "id": "gmail",
  "name": "Gmail",
  "description": "Multi-account email integration",
  "version": "1.0.0",
  "author": "core",
  "securityTier": 2,
  "authType": "oauth2",
  "capabilities": ["sync", "webhook", "execute"],
  "actions": ["send_email", "search_inbox", "archive", "label"],
  "dataTypes": ["email", "contact"],
  "configSchema": {
    "accounts": { "type": "array", "description": "Gmail accounts to connect" }
  }
}
```

**IntegrationAdapter interface:**
```typescript
interface IntegrationAdapter {
  id: string;
  name: string;
  securityTier: 1 | 2 | 3;

  // Lifecycle
  authorize(userId: string): Promise<OAuthTokens>;
  refresh(userId: string): Promise<void>;
  disconnect(userId: string): Promise<void>;

  // Data ingestion
  sync(userId: string, since: Date): Promise<Episode[]>;
  handleWebhook?(payload: unknown): Promise<Episode[]>;

  // Actions (named, discoverable)
  getActions(): ActionDefinition[];
  execute?(action: string, params: Record<string, unknown>): Promise<unknown>;
}

interface ActionDefinition {
  name: string;                    // 'send_email'
  description: string;             // For AI to understand when to use it
  executability: 'automated' | 'ai_assisted' | 'human_only';
  params: JSONSchema;              // Parameter schema
}
```

**How "just works" happens:**
1. System scans `packages/integrations/*/manifest.json` at startup
2. Registers each adapter in the integration registry
3. Actions are exposed as MCP tools automatically (AI can discover and use them)
4. Webhooks auto-register routes: `POST /webhooks/<integration_id>`
5. New integration = new directory + PR. No core code changes needed.

**For community contributors:**
```bash
# Create a new integration
npx lifeos create-integration todoist
# → Scaffolds manifest.json, adapter.ts, actions.ts, tests
# → Contributor fills in the adapter logic
# → Submit PR → review → merge → available to all users
```

### Integration Readiness & Priority

#### Phase 1 — Ready Now (MCP exists, 1-2 days each)
| Integration | MCP Available | Security Tier | Notes |
|-------------|--------------|---------------|-------|
| Gmail | Yes (GongRzhe, multi-account) | 2 | Multi-account OAuth, search/send |
| Google Calendar | Yes (nspady) | 1 | Events, scheduling |
| Slack | Yes (official) | 1 | Multi-workspace |
| GitHub | Yes (official) | 1 | Issues, PRs, code search |
| Fireflies.ai | Yes (official) | 1 | Already configured |
| Google Drive/Docs | Yes (already configured) | 1 | Already working |
| **Claude Code** | **Custom (hooks + JSONL parsing)** | **1** | **KEY — see below** |

#### Phase 2 — Custom MCP Needed (API available, 1-2 weeks each)
| Integration | API Available | Security Tier | Notes |
|-------------|--------------|---------------|-------|
| Oura Ring | Yes (v2.0 REST) | 3 (health) | Sleep, HRV, activity, readiness |
| SnapCalorie | Yes (REST) | 3 (health) | Food recognition, nutrition |
| Codex CLI | Yes (OTel export) | 1 | Session tracking |

#### Phase 3 — Complex (3-8 weeks each)
| Integration | Approach | Security Tier | Notes |
|-------------|----------|---------------|-------|
| Apple Health | Health Auto Export app → webhook | 3 (health) | No backend API, needs iOS bridge |
| Reolink cameras | reolink_aio Python lib → local bridge | 3 (sensitive) | LOCAL ONLY processing |
| Plaid (finance) | REST API + Plaid Link flow | 3 (finance) | Compliance-heavy, PCI-DSS |

### Claude Code Session Tracking (Key Integration)

Three capture methods, all recommended simultaneously:

**1. Stop Hook (real-time session capture)**
```json
// ~/.claude/settings.json
{
  "hooks": {
    "Stop": [{
      "type": "http",
      "url": "http://localhost:4000/api/nexus/claude-session",
      "headers": { "X-API-Key": "${NEXUS_API_KEY}" }
    }]
  }
}
```

**2. JSONL Transcript Parsing**
- Claude Code stores full sessions at `~/.claude/history.jsonl` (14.6 MB+)
- Parse: user prompts, tool calls (reads, edits, bash), assistant responses
- Extract: files changed, tokens used, duration, project context

**3. Git Commit Correlation**
- Post-commit hook links commits to active Claude Code session
- Bidirectional: session → commits, commit → session
- Tracks what AI helped build vs manual work

**4. OpenTelemetry Export**
```bash
CLAUDE_CODE_ENABLE_TELEMETRY=1
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```
Captures: API call metrics, tool execution traces, token counts, costs

---

## Security Architecture

### Three Processing Tiers

```
Tier 1 (Public/Work): Cloud AI processing OK
├── Task titles, categories, schedules
├── Work emails, Slack messages, GitHub
├── Coding sessions (non-sensitive repos)
└── Encrypted at rest in Convex

Tier 2 (Personal): Cloud AI with encryption
├── Personal emails, contact details
├── Relationship notes, birthday reminders
├── Daily summaries and patterns
└── Field-level encrypted in Convex

Tier 3 (Sensitive): LOCAL PROCESSING ONLY
├── Health data (Oura, SnapCalorie, Apple Health)
├── Camera footage (Reolink NVR)
├── Financial data (Plaid transactions)
├── Never sent to cloud AI APIs
└── Processed by local Ollama/llama.cpp
└── Stored in local encrypted SQLite OR
    field-level encrypted in Convex (summaries only)
```

### Encryption Strategy

**Field-Level Encryption (FLE) for database:**
- Each user has a master key (derived from password, stored in OS keychain)
- Per-field derived keys via HKDF: health_key, finance_key, contacts_key
- Sensitive fields encrypted client-side before Convex insert
- Convex stores ciphertext — even DB compromise reveals nothing
- Non-sensitive fields remain queryable (status, timestamps, domains, tags)

**Local Sensitive Data:**
- Reolink footage stays on local NVR — system queries metadata only
- Health metrics processed by local Ollama → only summaries sent to cloud
- Financial data encrypted locally, summaries (not raw transactions) in cloud

**Recommendation: Yes, encrypt everything in the database.** The overhead is minimal for field-level encryption, and it means a database breach exposes zero personal data.

---

## Reporting System

### Daily Digest (7:00 AM, configurable)
- Today's tasks (sorted by priority score)
- Overnight emails/messages needing attention (filtered by learned relevance)
- Calendar overview with meeting prep context
- Health summary (sleep score, readiness)
- Relationship reminders (birthdays, "haven't talked to X in Y days")
- Escalation alerts (important tasks going stale)

### Weekly Report (Sunday evening)
- Tasks completed vs planned
- Top accomplishments by domain
- Patterns detected this week
- Communication summary (emails sent/received, Slack activity)
- Health trends (sleep, activity, nutrition)
- Coding activity (sessions, files changed, tokens spent)
- Learning updates (what the system learned about your preferences)

### Monthly Report
- Goal progress tracking
- Financial summary (expense categories, tax-relevant items)
- Relationship health (interaction frequency vs desired cadence)
- Productivity trends (best days, worst days, patterns)
- System self-assessment (accuracy of predictions, false positive rate)

### Yearly "Wrapped" Report
- Total tasks completed, by domain
- Top 10 most impactful accomplishments
- Communication stats (emails, messages, meetings — hours spent)
- Health journey (trends over 12 months)
- Coding stats (sessions, lines changed, projects contributed to)
- "Most productive week" / "Longest streak"
- People you interacted with most
- What the system learned about you (personality insights)
- Predictions accuracy score
- Fun stats: "You said 'sounds good' 847 times in emails"

### Implementation
- Cloudflare Cron Workers trigger report generation
- AI summarizes raw analytics snapshots into human-readable reports
- Delivered via preferred channel (email, Slack DM, web dashboard)
- Web dashboard shows interactive versions with charts

---

## MCP Server — Tools Exposed

The MCP server exposes these tools for any connected AI client:

### Task Management
- `create_task(title, domain, tags, due_date, work_date)`
- `list_tasks(status?, domain?, tag?, sort_by?)`
- `update_task(id, fields)`
- `complete_task(id, outcome_notes?)`
- `drop_task(id, reason)` — feeds learning
- `get_kanban(domain?)` — returns board view
- `get_escalations()` — flagged important items going stale

### Memory
- `remember(content, domain, tags)` — store explicit memory
- `recall(query, domain?, limit?)` — semantic search
- `forget(memory_id)` — explicit removal
- `give_feedback(target_type, target_id, feedback_type, context)` — learning signal

### Integrations
- `check_email(account?, since?)` — summarized inbox
- `send_email(to, subject, body, account?)` — send via connected account
- `check_slack(workspace?, channel?, since?)`
- `check_github(repo?, type?)` — issues/PRs summary
- `get_meetings(date?)` — calendar + Fireflies notes
- `get_health_summary(date?)` — Oura + SnapCalorie + Apple Health
- `check_cameras(camera?, since?)` — Reolink event summary
- `get_coding_sessions(project?, since?)` — Claude Code/Codex history

### Reports
- `daily_digest()` — generate/retrieve today's digest
- `weekly_report()` — this week's report
- `get_analytics(period, domain?)` — raw stats

### People
- `get_contact(name)` — contact details + interaction history
- `upcoming_birthdays(days?)` — birthdays in next N days
- `neglected_contacts(days?)` — people you haven't reached out to

### System
- `system_status()` — integration health, sync status
- `system_learn(instruction)` — explicit behavioral rule
- `system_self_report()` — accuracy metrics, confidence distribution

---

## Phased Implementation Plan

> **Strategy:** Build the foundation that supports ALL domains, then add integrations across all four domains in parallel. The competitive insight is: don't try to perfect one domain before touching others — instead, get shallow coverage everywhere fast, then deepen.

### Phase 0: Foundation (Week 1-2)
- [ ] Initialize monorepo at `~/dev/<tbd>/` (pnpm workspaces + Turborepo)
- [ ] Set up Convex project + schema.ts with all tables + vector indexes
- [ ] MCP server skeleton (stdio + HTTP transport)
- [ ] Core engine: task CRUD + priority scoring + decay math
- [ ] Episodic memory: store + recall with pgvector embeddings
- [ ] Field-level encryption module (libsodium/tweetnacl)
- [ ] Security tier routing (classify + route to cloud vs local)
- [ ] CLI wrapper for quick interactions
- [ ] Claude Code Stop hook → capture sessions to DB

### Phase 1: All Domains — Shallow (Week 3-6)
> Goal: Get data flowing from every domain. Doesn't need to be perfect, just connected.

**Work:**
- [ ] Gmail integration (multi-account, read + search + send)
- [ ] Google Calendar integration (events + scheduling)
- [ ] Slack integration (multi-workspace, read + send)
- [ ] GitHub integration (issues, PRs, notifications)
- [ ] Fireflies.ai integration (already has MCP — connect to memory)
- [ ] Codex CLI session tracking (OTel export)

**Personal:**
- [ ] Contact/relationship management (CRUD + interaction tracking)
- [ ] Birthday tracking + reminder system
- [ ] Basic task kanban (all domains) in web dashboard

**Health:**
- [ ] Local Ollama bridge setup (Llama 3.2 8B on Apple Silicon)
- [ ] Oura Ring integration (sleep, HRV, readiness → local processing)
- [ ] SnapCalorie integration (nutrition data → local processing)

**Home:**
- [ ] Reolink camera event watcher (local Python bridge → motion events, person detection)
- [ ] Basic event logging: who entered/left, nap detection via camera zones

**Cross-cutting:**
- [ ] Daily digest generation (Cloudflare Cron → all domains)
- [ ] Webhook receiver (Cloudflare Worker) for push-based integrations

### Phase 2: Learning + Intelligence (Week 7-10)
- [ ] Feedback system (thumbs up/down, not relevant, correction)
- [ ] Daily consolidation cron (episodes → knowledge, per Bob's model)
- [ ] Weekly knowledge review + confidence decay
- [ ] Behavioral rules engine (DO/DON'T rules with confidence)
- [ ] Pattern detection across domains (weekly cron)
- [ ] Importance escalation alerts (high-impact tasks going stale)
- [ ] "Not relevant" learning loop (email/task filtering)
- [ ] Git commit correlation with coding sessions
- [ ] Self-healing: tiered error recovery (per Bob's model)

### Phase 3: Depth + Reports (Week 11-14)
- [ ] Apple Health bridge (Health Auto Export app → webhook → local processing)
- [ ] Plaid financial integration (expense tracking, tax categorization)
- [ ] Reolink: nap duration tracking, entry/exit timeline
- [ ] Weekly + monthly report generation
- [ ] Web dashboard: analytics views, charts, domain breakdowns
- [ ] Contact interaction frequency tracking + "neglected" alerts
- [ ] Proactive suggestions engine (based on patterns + rules)

### Phase 4: Platform + Wrapped (Week 15-20)
- [ ] Multi-tenant user management + Convex Auth
- [ ] Onboarding wizard (guided integration setup per domain)
- [ ] Yearly "Wrapped" report (full analytics pipeline)
- [ ] System self-assessment (prediction accuracy, false positive rate)
- [ ] Integration adapter marketplace pattern
- [ ] Mobile-responsive web dashboard
- [ ] Documentation for open-source release
- [ ] Rate-limiting, abuse prevention, cost tracking per user

---

## Technology Stack

> **Decision: Convex over Supabase.** Real-time sync by default, infra-as-code (everything in a `convex/` folder), self-hostable, dramatically better for AI-written code (no migrations, no RLS, no dashboard config), native vector search for memory, built-in crons/work pools/file storage. The entire backend collapses into one folder.

| Component | Technology | Why |
|-----------|-----------|-----|
| Language | TypeScript (strict) | Consistent with DriveClub, type safety |
| Monorepo | pnpm + Turborepo | Proven pattern from DriveClub |
| **Database + Backend** | **Convex** | Real-time sync, infra-as-code, vector search, self-hostable, AI-friendly |
| Auth | Convex Auth (or Better Auth) | Integrated with Convex, no separate service |
| File Storage | Convex File Storage + R2 CDN | Transcripts, health exports, camera metadata |
| Crons | Convex Crons | Consolidation, reports, decay — no separate workers |
| Work Pools | Convex Work Pools component | Rate-limited integration API calls |
| Analytics Export | ClickHouse or PostHog | For Wrapped-style heavy aggregation (stream from Convex) |
| Local AI | Ollama (Llama 3.2 / Mistral) | Free, private, runs on Apple Silicon |
| Web Dashboard | Next.js or Vite + React | Real-time via Convex `useQuery` hooks |
| MCP Server | @modelcontextprotocol/sdk | Official TypeScript SDK, calls Convex via Node SDK |
| Encryption | libsodium (tweetnacl) | Field-level encryption before Convex insert |
| Embeddings | OpenAI text-embedding-3-small | For Convex vector search indexes |

### What Convex replaces

| Before (Supabase plan) | After (Convex) |
|------------------------|----------------|
| Supabase PostgreSQL | Convex DB (schema.ts) |
| Drizzle ORM + migrations | Just TypeScript (no ORM needed) |
| Supabase RLS policies | Queries/mutations with auth checks in code |
| pgvector extension | Convex native vector search |
| Supabase Realtime | Built-in (every query auto-syncs) |
| Cloudflare Workers (webhooks) | Convex HTTP actions |
| Cloudflare Cron Workers | Convex crons |
| Fly.io Machines (compute) | Convex actions (or Fly.io for heavy local AI tasks) |
| Supabase Auth | Convex Auth |

### Simplified project structure with Convex

```
lifeos/
├── apps/
│   ├── web/                    # Dashboard (Vite + React) — uses Convex useQuery/useMutation
│   ├── mcp-server/             # MCP server — uses Convex Node SDK
│   └── cli/                    # CLI — uses Convex Node SDK
├── convex/                     # THE ENTIRE BACKEND
│   ├── schema.ts               # All tables, indexes, vector indexes
│   ├── tasks.ts                # Task CRUD, priority scoring, kanban
│   ├── memory.ts               # Episodes, knowledge, recall, consolidation
│   ├── integrations.ts         # Integration registry, adapter orchestration
│   ├── contacts.ts             # People/CRM, relationship tracking
│   ├── coding.ts               # Claude Code/Codex session tracking
│   ├── analytics.ts            # Report generation, Wrapped data
│   ├── feedback.ts             # Learning, behavioral rules
│   ├── crons.ts                # Scheduled: consolidation, decay, reports
│   ├── http.ts                 # Webhook receiver for push integrations
│   ├── auth.ts                 # Auth configuration
│   └── _generated/             # Auto-generated types (committed)
├── packages/
│   ├── integrations/           # Pluggable adapters (manifest.json + adapter.ts)
│   ├── security/               # Encryption, tier routing
│   ├── analytics-export/       # Stream to ClickHouse for Wrapped
│   └── shared/                 # Types, constants
├── local/
│   ├── ollama-bridge/          # Tier 3 sensitive data processing
│   └── reolink-watcher/        # Local camera event processing
└── docker/
    └── docker-compose.yml      # Self-hosting: Convex + local services
```

---

## Estimated Costs (Personal Use)

| Service | Monthly Cost |
|---------|-------------|
| Convex (Pro or usage-based) | ~$25 |
| Fly.io (only for heavy local AI relay) | $0-5 |
| OpenAI Embeddings | ~$2 |
| Claude API (for consolidation) | ~$5-10 |
| Ollama (local) | $0 |
| ClickHouse Cloud (Wrapped analytics) | ~$0-10 |
| **Total** | **~$33-42/month** |

---

## Open-Core Business Model

### What's Free (Self-Hosted)

Everything in the repo. The full platform is open-source (MIT or AGPL — TBD):
- All integrations (dynamic adapter framework)
- Memory system (episodic, knowledge, patterns)
- Task management + kanban + priority scoring
- Learning engine + behavioral rules
- Local processing with Ollama
- CLI + MCP server
- Web dashboard
- Reports (daily/weekly/monthly)

**Self-hosting requirements:** Docker Compose on any machine (Mac Mini, VPS, etc.) + own Supabase instance (or local PostgreSQL + pgvector). Documentation makes this straightforward.

### What's Paid (Managed Hosting)

For users who don't want to self-host:
- **Managed Supabase instance** — we handle DB, backups, scaling
- **Managed Cloudflare Workers** — webhook routing, cron jobs
- **Managed Fly.io compute** — AI processing, consolidation
- **OAuth proxy** — simplifies integration auth (no need for own Google Cloud project)
- **Automatic updates** — always on latest version
- **Priority support**

### Pricing Tiers (Eventual)

| Tier | Price | What You Get |
|------|-------|-------------|
| **Self-hosted** | Free | Everything, you run it |
| **Starter** | ~$15/month | Managed hosting, 5 integrations, basic AI |
| **Pro** | ~$30/month | All integrations, unlimited AI, priority support |
| **Family** | ~$50/month | Multi-user (2-5 accounts), shared household |

### Reddit/Dev Community Positioning

- Lead with "I built this for myself and open-sourced it"
- Self-hosted is genuinely free and full-featured (not crippled)
- Managed is for convenience, not gating features
- This is the model that resonates with r/selfhosted, HackerNews, and dev communities
- Avoids the "hand out" feeling — you're sharing a tool, paid hosting is just a service

### Open Source License Consideration

| License | Pros | Cons |
|---------|------|------|
| **MIT** | Maximum adoption, no friction | Companies can fork without contributing back |
| **AGPL** | Forces contributions back, protects managed hosting moat | Scares some enterprise users |
| **BSL (Business Source License)** | Protects managed hosting revenue, allows self-hosting | Less "truly open source" perception |

**Recommendation: AGPL** — forces any hosted version to share modifications. Self-hosting users get full freedom. Protects the managed hosting business from competitors spinning up a competing SaaS from your code.

---

## Verification Plan

1. **Unit tests**: Core engine (priority scoring, memory recall, decay math)
2. **Integration tests**: Each adapter against real APIs (staging accounts)
3. **E2E test**: Create task via MCP → verify in dashboard → complete → verify in report
4. **Memory test**: Store 100 episodes → consolidate → verify knowledge extraction
5. **Learning test**: Give 20 "not relevant" feedback events → verify behavioral rule created → verify future filtering
6. **Security test**: Verify Tier 3 data never leaves local processing
7. **Escalation test**: Create high-impact task → advance time → verify escalation flag
8. **Integration framework test**: Create new integration from scaffold → verify auto-discovery → verify actions exposed as MCP tools
9. **Self-hosting test**: Docker Compose up on clean machine → verify full functionality
