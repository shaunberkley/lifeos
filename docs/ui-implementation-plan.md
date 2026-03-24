# LifeOS Initial UI Implementation Plan

Status: proposed public execution plan

Date: 2026-03-23

Owner: Shaun Berkley

This document is the public-safe UI plan for the first usable LifeOS web surface.

It is intentionally aligned to the canonical product and architecture docs:

- typed state first
- local privacy boundary remains non-negotiable
- AI is a constrained layer on top of product state
- early UI work must respect current repo maturity and hardening gates

## 1. Product Goal

The first UI should let a user:

1. open LifeOS and understand what matters today
2. capture a task or reminder quickly
3. review important communications, schedule, and task load in one place
4. see which integrations are connected and which restricted-data systems are local-only
5. manage tasks and people through explicit typed surfaces

If only one page feels excellent in v0.1, it should be the Daily Briefing.

## 2. Non-Negotiable Constraints

These constraints come from the product architecture and apply to every UI decision:

1. Restricted raw health, finance, and camera data must not be exposed as cloud-backed raw records in the UI.
2. The UI should show only policy-approved derived summaries for restricted domains.
3. The initial UI must not become a prompt-first shell. Typed screens remain primary.
4. Unimplemented AI or workflow paths must fail closed or be visibly marked unavailable.
5. The repo and GitHub issues must not contain confidential external design references.

## 3. Execution Reality

The repository is still in foundation stage. The current web app is a placeholder and the hardening program is still active.

Because of that, UI work should be split into two layers:

- foundation work required for any real UI
- feature slices that can render with mock data before full backend readiness

This plan assumes v0.1 UI can begin once the web app has:

- TanStack Router wired
- Convex React provider wired
- a minimal theme and token system
- at least one real web smoke test

## 4. UI Principles

### 4.1 Typed Screens First

LifeOS is not a chat window with tabs around it. The first interaction should be with durable product state:

- Daily Briefing
- Tasks
- People
- Integrations
- Settings

### 4.2 One Command Surface, Not Three

v0.1 should use a single command surface:

- `Cmd+K` global omnibox for navigation, search, and quick creation

Do not ship a separate persistent multi-tab AI command bar in the first pass. That creates overlap with header search and the command palette before workflow backends exist.

### 4.3 Privacy Must Be Legible

Restricted domains should visibly communicate:

- local-only processing
- bridge connection state
- last successful sync or projection time
- whether the UI is showing a derived summary versus editable product state

### 4.4 Build a Small Internal Design System First

Use `packages/ui` as the source for:

- tokens
- primitives
- common patterns

Avoid pasting unrelated shadcn examples directly into feature routes without normalization.

### 4.5 Boilerplate Discipline

Every major UI slice should name exact source files before implementation starts.

Rules:

- every reusable pattern should be anchored to a real source file
- source paths should be exact within the source repo root
- copied code must be normalized into LifeOS patterns and tokens before reuse
- route issues should keep the source table in the issue body

Source roots for this plan:

| Source | Root |
| --- | --- |
| shadcn UI Kit | `/Users/shaunberkley/dev/shadcn-ui-kit-dashboard/` |
| satnaing/shadcn-admin | `https://github.com/satnaing/shadcn-admin` |
| shadcn blocks | `https://www.shadcn.io/blocks/` |

## 5. Visual Direction

The first UI should feel calm, operational, and dense enough to be useful every morning.

Guidelines:

- neutral light-first palette with strong text contrast
- subtle surfaces and borders, not flashy gradients
- clear hierarchy through size, weight, and spacing, not opacity alone
- keyboard-first interactions
- mobile support for core flows, but desktop is the primary target for v0.1

Suggested base tokens:

```css
:root {
  --background: #ffffff;
  --background-muted: #f6f7f8;
  --foreground: #161616;
  --foreground-muted: #5f6368;
  --foreground-faint: #8a8f98;
  --border: #e7e9ee;
  --primary: #161616;
  --primary-foreground: #ffffff;
  --success: #147a52;
  --warning: #9a6700;
  --danger: #b42318;
  --radius: 0.5rem;
}
```

Dark mode is allowed, but only after the token system is in place and both modes are readable without per-screen fixes.

## 6. Initial Route Map

- `/` Daily Briefing
- `/tasks` Tasks workspace
- `/people` People workspace
- `/integrations` Integrations and pairing
- `/settings/account`
- `/settings/notifications`
- `/settings/privacy`
- `/settings/appearance`

## 7. v0.1 Scope

### 7.1 In Scope

- app shell, navigation, routing, theme tokens
- Daily Briefing
- global omnibox
- tasks workspace
- people workspace
- integrations overview and connection states
- settings required to support the system model
- mock-data rendering, empty states, loading states, error states

### 7.2 Explicitly Out Of Scope For First Pass

- persistent AI bottom bar
- voice input
- file upload flows
- rich text editor
- full analytics dashboards
- full OAuth success path for every provider
- unrestricted freeform AI chat UI
- user-configurable weakening of restricted-domain privacy boundaries

## 8. Information Architecture

### 8.1 Global Navigation

Primary nav:

- Home
- Tasks
- People
- Integrations
- Settings

Secondary grouped indicators:

- domain counts
- sync health
- bridge status for restricted domains

The sidebar may display domain counts, but those counts should not masquerade as domain pages until domain-specific routes actually exist.

### 8.2 Global Omnibox

Trigger:

- `Cmd+K`
- optional header button on smaller screens

Capabilities in v0.1:

- navigate to routes
- search tasks, people, and integrations
- create task
- create reminder placeholder
- create person

Capabilities not required in v0.1:

- long-form AI answers
- agentic action execution

## 9. Feature Slices

## U0. UI Foundation

### Goal

Provide the system every subsequent route depends on.

### Scope

- TanStack Router structure in `apps/web`
- Convex provider wiring
- theme tokens and provider
- `packages/ui` token and primitive baseline
- shell layout primitives
- mock-data layer for web routes
- shared empty, loading, and error states

### Boilerplate Sources

| Element | Source | Exact Path |
| --- | --- | --- |
| Sidebar primitive | shadcn UI Kit | `components/ui/sidebar.tsx` |
| Command primitive | shadcn UI Kit | `components/ui/command.tsx` |
| Settings layout shape | shadcn UI Kit | `app/dashboard/(auth)/pages/settings/layout.tsx` |
| Settings sidebar nav pattern | shadcn UI Kit | `app/dashboard/(auth)/pages/settings/components/sidebar-nav.tsx` |
| Empty state | shadcn UI Kit | `components/ui/empty.tsx` |
| Dialog | shadcn UI Kit | `components/ui/dialog.tsx` |

### Acceptance Criteria

- all v0.1 routes mount inside a common shell
- shared tokens exist and are used by route components
- every v0.1 route can render with mock data
- one browser smoke test proves basic navigation

## U1. App Shell And Global Omnibox

### Goal

Establish the persistent frame and the single global command surface.

### Shell Contents

- collapsible sidebar
- top header with page title and contextual actions
- global omnibox
- user menu
- mobile drawer behavior

### Boilerplate Sources

| Element | Source | Exact Path |
| --- | --- | --- |
| Collapsible sidebar | shadcn UI Kit | `components/layout/sidebar/app-sidebar.tsx` |
| Main nav | shadcn UI Kit | `components/layout/sidebar/nav-main.tsx` |
| Sidebar user footer | shadcn UI Kit | `components/layout/sidebar/nav-user.tsx` |
| Header bar | shadcn UI Kit | `components/layout/header/index.tsx` |
| Header search | shadcn UI Kit | `components/layout/header/search.tsx` |
| Theme switch | shadcn UI Kit | `components/layout/header/theme-switch.tsx` |
| User menu | shadcn UI Kit | `components/layout/header/user-menu.tsx` |
| Notifications affordance | shadcn UI Kit | `components/layout/header/notifications.tsx` |
| Command palette | shadcn UI Kit | `components/ui/command.tsx` |
| Sidebar primitive | shadcn UI Kit | `components/ui/sidebar.tsx` |

### Acceptance Criteria

- active route highlighting works
- sidebar collapses on desktop and becomes a drawer on mobile
- `Cmd+K` opens omnibox
- omnibox can navigate and create a task using a placeholder or real mutation path
- theme preference persists locally

## U2. Daily Briefing

### Goal

Answer one question: what matters today?

### Layout

Main column:

- Attention
- Important Communications
- Today's Schedule
- Tasks Today

Secondary column:

- Health summary
- Home summary
- Coding summary

### Boilerplate Sources

| Element | Source | Exact Path |
| --- | --- | --- |
| Summary and alert cards | shadcn UI Kit | `app/dashboard/(auth)/hospital-management/components/summary-cards.tsx` |
| Alert primitive | shadcn UI Kit | `components/ui/alert.tsx` |
| Card primitive | shadcn UI Kit | `components/ui/card.tsx` |
| Badge primitive | shadcn UI Kit | `components/ui/badge.tsx` |
| Calendar and appointments pattern | shadcn UI Kit | `app/dashboard/(auth)/hospital-management/components/upcoming-appointments.tsx` |
| Planned calendar pattern | shadcn UI Kit | `app/dashboard/(auth)/hospital-management/components/planned-calendar.tsx` |
| Timeline primitive | shadcn UI Kit | `components/ui/timeline.tsx` |
| Avatar primitive | shadcn UI Kit | `components/ui/avatar.tsx` |
| Task list pattern | shadcn UI Kit | `app/dashboard/(auth)/crm/components/recent-tasks.tsx` |
| Todo app pattern | shadcn UI Kit | `app/dashboard/(auth)/apps/todo-list-app/page.tsx` |
| Reminders pattern | shadcn UI Kit | `app/dashboard/(auth)/project-management/components/reminders.tsx` |
| Checkbox primitive | shadcn UI Kit | `components/ui/checkbox.tsx` |
| KPI cards | shadcn UI Kit | `app/dashboard/(auth)/finance/components/kpi-cards.tsx` |
| Chart primitive | shadcn UI Kit | `components/ui/chart.tsx` |
| Fitness widget pattern | shadcn UI Kit | `app/dashboard/(auth)/widgets/fitness/page.tsx` |
| Mail list pattern | shadcn UI Kit | `app/dashboard/(auth)/apps/mail/components/mail-list.tsx` |
| Mail display pattern | shadcn UI Kit | `app/dashboard/(auth)/apps/mail/components/mail-display.tsx` |

### U2.1 Attention

Show urgent items that need a decision today.

Examples:

- stale high-impact tasks
- overdue approvals
- relationship reminders with urgency

Acceptance criteria:

- shows up to five items sorted by severity
- each item links to a typed destination
- empty state exists

### U2.2 Important Communications

Show emails, messages, PR requests, and similar cross-source items that need attention.

This is a first-class section because missed communications are a core user pain.

Acceptance criteria:

- shows high-signal communication items from projected data only
- each row shows source, sender/context, summary, and age
- user can open source detail or create a task from the item
- empty state exists

### U2.3 Today's Schedule

Show today's calendar timeline.

Acceptance criteria:

- chronological ordering
- all-day event treatment
- join or open action when available
- empty state exists

### U2.4 Tasks Today

Show tasks due today or scheduled for today.

Acceptance criteria:

- sorted by priority score
- inline complete action
- filter by domain
- quick add task entry
- link to full tasks workspace

### U2.5 Restricted-Domain Summaries

Show derived summaries only for:

- health
- home
- coding

Acceptance criteria:

- health and home cards carry a local-only badge
- cards show derived metrics, not raw payloads
- empty states explain missing integration or bridge connection

## U3. Tasks Workspace

### Goal

Manage cross-domain tasks through durable product state.

### Views

- board view
- list view
- detail panel

### Boilerplate Sources

| Element | Source | Exact Path |
| --- | --- | --- |
| Kanban page | shadcn UI Kit | `app/dashboard/(auth)/apps/kanban/page.tsx` |
| Kanban board | shadcn UI Kit | `app/dashboard/(auth)/apps/kanban/components/kanban-board.tsx` |
| Tasks page | shadcn UI Kit | `app/dashboard/(auth)/apps/tasks/page.tsx` |
| Data table | shadcn UI Kit | `app/dashboard/(auth)/apps/tasks/components/data-table.tsx` |
| Table columns | shadcn UI Kit | `app/dashboard/(auth)/apps/tasks/components/columns.tsx` |
| Table toolbar | shadcn UI Kit | `app/dashboard/(auth)/apps/tasks/components/data-table-toolbar.tsx` |
| Table pagination | shadcn UI Kit | `app/dashboard/(auth)/apps/tasks/components/data-table-pagination.tsx` |
| Row actions | shadcn UI Kit | `app/dashboard/(auth)/apps/tasks/components/data-table-row-actions.tsx` |
| Faceted filter | shadcn UI Kit | `app/dashboard/(auth)/apps/tasks/components/data-table-faceted-filter.tsx` |
| View options | shadcn UI Kit | `app/dashboard/(auth)/apps/tasks/components/data-table-view-options.tsx` |
| Tasks schema pattern | shadcn UI Kit | `app/dashboard/(auth)/apps/tasks/data/schema.ts` |
| Sheet primitive | shadcn UI Kit | `components/ui/sheet.tsx` |
| Input primitive | shadcn UI Kit | `components/ui/input.tsx` |
| Textarea primitive | shadcn UI Kit | `components/ui/textarea.tsx` |
| Select primitive | shadcn UI Kit | `components/ui/select.tsx` |
| Slider primitive | shadcn UI Kit | `components/ui/slider.tsx` |

### Canonical Task Statuses

The UI must reflect canonical statuses from the domain model:

- `inbox`
- `backlog`
- `todo`
- `in_progress`
- `done`
- `archived`
- `dropped`

The board may simplify presentation, but it must not invent a conflicting state model.

### U3.1 Board View

Acceptance criteria:

- drag and drop between visible columns
- domain filters
- counts per column
- add task entry point
- click opens detail panel

### U3.2 List View

Acceptance criteria:

- sortable columns
- filters for domain, status, priority, executability, source
- full-text search
- bulk actions only if they can be implemented safely in v0.1

### U3.3 Task Detail Panel

v0.1 fields:

- title
- description as plain textarea
- status
- domain
- due date
- work date
- executability
- priority inputs and computed score display
- source metadata

Acceptance criteria:

- opens as right-side panel
- edits sync through explicit mutations or mocked action layer
- drop action requires a reason

## U4. People Workspace

### Goal

Provide a usable personal CRM surface without pretending unfinished enrichment is complete.

### Boilerplate Sources

| Element | Source | Exact Path |
| --- | --- | --- |
| Users page | shadcn UI Kit | `app/dashboard/(auth)/pages/users/page.tsx` |
| Data table | shadcn UI Kit | `app/dashboard/(auth)/apps/tasks/components/data-table.tsx` |
| CRM leads pattern | shadcn UI Kit | `app/dashboard/(auth)/crm/components/leads.tsx` |
| Avatar primitive | shadcn UI Kit | `components/ui/avatar.tsx` |
| Badge primitive | shadcn UI Kit | `components/ui/badge.tsx` |
| User profile page | shadcn UI Kit | `app/dashboard/(auth)/pages/user-profile/page.tsx` |
| Profile page | shadcn UI Kit | `app/dashboard/(auth)/pages/profile/page.tsx` |
| Activity stream pattern | shadcn UI Kit | `app/dashboard/(auth)/pages/user-profile/components/activity-stream.tsx` |
| Timeline primitive | shadcn UI Kit | `components/ui/timeline.tsx` |
| Sheet primitive | shadcn UI Kit | `components/ui/sheet.tsx` |
| Tabs primitive | shadcn UI Kit | `components/ui/tabs.tsx` |

### U4.1 Contact List

Acceptance criteria:

- searchable and sortable table
- group filter rail with counts
- last-contacted health indicator
- birthday badge for upcoming birthdays
- create person entry point

### U4.2 Contact Detail Panel

v0.1 tabs:

- Overview
- Interactions
- Notes

Acceptance criteria:

- right-side panel
- editable core profile fields
- quick actions create typed drafts or tasks, not opaque AI magic

### U4.3 Interaction Timeline

Acceptance criteria:

- chronological timeline
- source badges
- expandable item details where data exists

## U5. Integrations And Pairing

### Goal

Make system readiness visible.

This page is not just marketing cards. It should tell the truth about what is connected, what is local-only, and what is blocked.

### Boilerplate Sources

| Element | Source | Exact Path |
| --- | --- | --- |
| Onboarding flow page | shadcn UI Kit | `app/dashboard/(auth)/pages/onboarding-flow/page.tsx` |
| Onboarding wizard | shadcn UI Kit | `app/dashboard/(auth)/pages/onboarding-flow/components/onboarding.tsx` |
| Card primitive | shadcn UI Kit | `components/ui/card.tsx` |
| Badge primitive | shadcn UI Kit | `components/ui/badge.tsx` |
| Empty state | shadcn UI Kit | `components/ui/empty.tsx` |
| Dialog primitive | shadcn UI Kit | `components/ui/dialog.tsx` |
| Progress primitive | shadcn UI Kit | `components/ui/progress.tsx` |
| Alert primitive | shadcn UI Kit | `components/ui/alert.tsx` |

### U5.1 Integrations Overview

Sections:

- Work
- Personal communication
- Restricted domains
- Developer tools

Acceptance criteria:

- card per integration
- status badge
- last sync or projection time when connected
- clear empty state when unconfigured

### U5.2 Pairing And Connection States

Acceptance criteria:

- local-only connectors show bridge dependency clearly
- OAuth and API-key integrations show truthful not-yet-implemented states if backend paths are missing
- restricted connectors never imply cloud processing of raw data

## U6. Settings

### Goal

Expose configuration that reinforces the system model.

### Boilerplate Sources

| Element | Source | Exact Path |
| --- | --- | --- |
| Settings layout | shadcn UI Kit | `app/dashboard/(auth)/pages/settings/layout.tsx` |
| Settings sidebar | shadcn UI Kit | `app/dashboard/(auth)/pages/settings/components/sidebar-nav.tsx` |
| Account settings page | shadcn UI Kit | `app/dashboard/(auth)/pages/settings/account/page.tsx` |
| Notifications page | shadcn UI Kit | `app/dashboard/(auth)/pages/settings/notifications/page.tsx` |
| Appearance page | shadcn UI Kit | `app/dashboard/(auth)/pages/settings/appearance/page.tsx` |
| Billing page as destructive-settings reference | shadcn UI Kit | `app/dashboard/(auth)/pages/settings/billing/page.tsx` |

### U6.1 Account

- display name
- email
- workspace name
- timezone

### U6.2 Notifications

- daily digest time
- weekly report day
- per-channel notification toggles

### U6.3 Privacy And Bridge

This is not a place to weaken domain privacy rules.

It should show:

- local bridge connection state
- last seen
- encryption or key status
- export path
- disconnect and destructive actions

### U6.4 Appearance

- theme mode
- density
- sidebar behavior

## 10. Build Order

1. U0 UI Foundation
2. U1 App Shell And Global Omnibox
3. U2 Daily Briefing with mock data
4. U5 Integrations And Pairing
5. U3 Tasks Workspace
6. U4 People Workspace
7. U6 Settings
8. AI-backed omnibox actions after workflows and policies exist

## 11. Engineering Rules For UI Work

1. Build route-level screens from small feature components.
2. Prefer plain inputs over heavy editors in v0.1.
3. Keep mock-data contracts close to eventual domain models.
4. Do not duplicate schema concepts in ad hoc frontend enums when generated types can be used.
5. If a workflow is not implemented, show an honest disabled or stub state.
6. Do not introduce per-page one-off styling when a token or shared pattern should exist.

## 12. Verification

- all v0.1 routes render with mock data
- all v0.1 routes render empty, loading, and error states
- keyboard navigation works for primary flows
- mobile layout remains usable for navigation, briefing, and task capture
- restricted-domain cards never show raw restricted payloads
- no confidential design references exist in tracked docs, issues, or code
- Biome, TypeScript, and test checks pass
- at least one component or route rendering test exists per parent issue

## 13. GitHub Issue Hierarchy

Parent epic:

- `UI v0.1: first daily operating surface`

Parent issues:

- `U0: UI foundation`
- `U1: app shell and omnibox`
- `U2: Daily Briefing`
- `U3: tasks workspace`
- `U4: people workspace`
- `U5: integrations and pairing`
- `U6: settings`

Child issues:

- `U0.1: router, providers, and shell bootstrap`
- `U0.2: tokens, primitives, and shared states`
- `U0.3: mock-data harness and web smoke test`
- `U1.1: sidebar, header, and mobile drawer`
- `U1.2: global omnibox`
- `U2.1: attention section`
- `U2.2: important communications section`
- `U2.3: today's schedule section`
- `U2.4: tasks today section`
- `U2.5: restricted-domain summaries`
- `U3.1: board view`
- `U3.2: list view`
- `U3.3: task detail panel`
- `U4.1: contact list and groups`
- `U4.2: contact detail panel`
- `U4.3: interaction timeline`
- `U5.1: integrations overview`
- `U5.2: pairing and connection states`
- `U6.1: account and notifications`
- `U6.2: privacy and bridge settings`
- `U6.3: appearance settings`

The GitHub issue tree should use real parent-child issue nesting, not Markdown checklists.
