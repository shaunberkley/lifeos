export type StatTone = "neutral" | "success" | "warning" | "danger";
export type StatusTone = "success" | "warning" | "danger" | "info";

export interface OverviewStat {
  label: string;
  value: string;
  detail: string;
  tone: StatTone;
}

export interface ProviderConnection {
  id: string;
  name: string;
  kind: "cloud" | "local" | "integration";
  status: "connected" | "paired" | "degraded" | "review-only";
  endpoint: string;
  owner: string;
  lastSync: string;
  note: string;
}

export interface ReviewPolicyRule {
  id: string;
  name: string;
  mode: "allow" | "review" | "deny";
  summary: string;
  enforcement: string;
}

export interface ReviewRunFinding {
  severity: "high" | "medium" | "low";
  title: string;
  rationale: string;
  recommendation: string;
}

export interface ReviewRun {
  id: string;
  title: string;
  source: string;
  status: "queued" | "in-review" | "needs-attention" | "closed";
  priority: "P0" | "P1" | "P2";
  startedAt: string;
  duration: string;
  reviewer: string;
  summary: string;
  findings: ReviewRunFinding[];
  checkpoints: string[];
}

export interface MonitoringSignal {
  name: string;
  value: string;
  tone: StatusTone;
  note: string;
}

export interface OpsEvent {
  time: string;
  title: string;
  detail: string;
}

export const overviewStats: OverviewStat[] = [
  {
    label: "Open review runs",
    value: "18",
    detail: "5 are awaiting a human decision, 3 are policy-blocked.",
    tone: "warning",
  },
  {
    label: "Connected providers",
    value: "6/7",
    detail: "All remote providers are healthy; the local bridge is paired.",
    tone: "success",
  },
  {
    label: "Policy blocks",
    value: "4",
    detail: "Restricted data, missing attestations, and one ambiguous prompt.",
    tone: "danger",
  },
  {
    label: "Median turnaround",
    value: "17m",
    detail: "From intake to closeout across the last 24 hours.",
    tone: "neutral",
  },
];

export const providerConnections: ProviderConnection[] = [
  {
    id: "openai",
    name: "OpenAI",
    kind: "cloud",
    status: "connected",
    endpoint: "Responses API",
    owner: "Reviewer policy service",
    lastSync: "2m ago",
    note: "Used for summarization, classification, and structured evidence drafting.",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    kind: "cloud",
    status: "connected",
    endpoint: "Claude Code / API",
    owner: "Engineering review lane",
    lastSync: "5m ago",
    note: "Available for higher-context review passes and code-change reasoning.",
  },
  {
    id: "local-bridge",
    name: "Local Bridge",
    kind: "local",
    status: "paired",
    endpoint: "localhost + signed envelopes",
    owner: "Device-bound reviewer",
    lastSync: "just now",
    note: "Raw restricted data stays on device. Only sanitized derivatives cross the boundary.",
  },
  {
    id: "github",
    name: "GitHub",
    kind: "integration",
    status: "review-only",
    endpoint: "Pull request metadata",
    owner: "Project orchestration",
    lastSync: "1m ago",
    note: "Ingests review runs, labels, and status transitions. No secret content is stored here.",
  },
];

export const reviewPolicyRules: ReviewPolicyRule[] = [
  {
    id: "restricted-data",
    name: "Restricted data stays local",
    mode: "deny",
    summary: "Raw health, finance, and camera payloads never move to remote models.",
    enforcement: "Fail closed if a remote path is selected for protected content.",
  },
  {
    id: "human-escalation",
    name: "Ambiguity requires escalation",
    mode: "review",
    summary: "If intent or provenance is unclear, the run pauses for human approval.",
    enforcement: "Review queues surface the exact policy that triggered the pause.",
  },
  {
    id: "evidence-traceability",
    name: "Every review has an audit trail",
    mode: "allow",
    summary: "Findings must include source links, timestamps, and a concrete recommendation.",
    enforcement: "Runs without evidence remain open and are never marked complete.",
  },
  {
    id: "model-selection",
    name: "Model choice follows data class",
    mode: "review",
    summary: "Sensitive classes prefer local models; general classes may use remote providers.",
    enforcement: "Policy guard blocks any provider that lacks the required trust tier.",
  },
];

export const reviewRuns: ReviewRun[] = [
  {
    id: "run-onboarding-regression",
    title: "Onboarding regression sweep",
    source: "GitHub pull requests",
    status: "in-review",
    priority: "P0",
    startedAt: "Today 08:40",
    duration: "14m",
    reviewer: "LifeOS Reviewer",
    summary:
      "Cross-checking recent onboarding changes against policy, accessibility, and release readiness.",
    findings: [
      {
        severity: "high",
        title: "Missing approval gate for the billing handoff",
        rationale:
          "A customer-facing path can currently reach a payment-sensitive step without review.",
        recommendation: "Insert an explicit policy checkpoint before the handoff is committed.",
      },
      {
        severity: "medium",
        title: "Status copy does not explain the fallback path",
        rationale:
          "Operators cannot tell whether a rerun will stay local or fan out to cloud providers.",
        recommendation: "Add a local-first note and a fallback indicator in the run detail header.",
      },
    ],
    checkpoints: ["Policy evaluation complete", "Evidence bundle attached", "Human review pending"],
  },
  {
    id: "run-bridge-health",
    title: "Bridge health and device pairing audit",
    source: "Local bridge telemetry",
    status: "needs-attention",
    priority: "P1",
    startedAt: "Today 07:55",
    duration: "9m",
    reviewer: "Ops lane",
    summary:
      "Checks pairing freshness, envelope signatures, and queue lag for the local-only path.",
    findings: [
      {
        severity: "high",
        title: "One envelope arrived without a current signature timestamp",
        rationale:
          "The bridge accepted a payload that needs revalidation before it can be projected.",
        recommendation:
          "Block projection until the envelope is re-signed or retried from the source device.",
      },
    ],
    checkpoints: ["Device pairing verified", "Queue lag measured", "Signature freshness pending"],
  },
  {
    id: "run-dependency-bump",
    title: "Dependency bump: Vite / Biome / Convex",
    source: "Package updates",
    status: "queued",
    priority: "P2",
    startedAt: "Planned later today",
    duration: "n/a",
    reviewer: "Automation",
    summary: "A queued maintenance pass for runtime, toolchain, and integration dependencies.",
    findings: [],
    checkpoints: [
      "CI baseline healthy",
      "Coverage thresholds unchanged",
      "Security review requested",
    ],
  },
];

export const monitoringSignals: MonitoringSignal[] = [
  {
    name: "Queue lag",
    value: "2m",
    tone: "success",
    note: "Projection backlog is within the current daily SLA.",
  },
  {
    name: "Webhook retries",
    value: "1",
    tone: "warning",
    note: "One transient retry on a GitHub event; no data loss observed.",
  },
  {
    name: "Dead letters",
    value: "0",
    tone: "success",
    note: "No failed envelopes are sitting in the quarantine lane.",
  },
  {
    name: "Manual escalations",
    value: "3",
    tone: "info",
    note: "Operators opened three reviews to verify policy outcomes.",
  },
];

export const opsEvents: OpsEvent[] = [
  {
    time: "08:42",
    title: "Policy gate raised a manual review",
    detail: "The onboarding sweep hit a billing-sensitive step and paused before commit.",
  },
  {
    time: "08:31",
    title: "Local bridge paired successfully",
    detail: "A fresh signed envelope arrived from the device and projected cleanly.",
  },
  {
    time: "08:15",
    title: "GitHub pull request sync completed",
    detail: "Review metadata updated without affecting restricted data paths.",
  },
];
