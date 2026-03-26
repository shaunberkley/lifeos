import { useEffect, useState } from "react";
import type {
  MonitoringSignal,
  OpsEvent,
  OverviewStat,
  ProviderConnection,
  ReviewPolicyRule,
  ReviewRun,
} from "./reviewerData";
import { createShellReviewerWorkspace, loadReviewerWorkspaceState } from "./reviewerWorkspace";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="section-heading">
      <p className="section-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="section-copy">{copy}</p>
    </div>
  );
}

function TonePill({
  tone,
  children,
}: {
  tone: "neutral" | "success" | "warning" | "danger" | "info";
  children: string;
}) {
  return <span className={joinClasses("pill", `pill-${tone}`)}>{children}</span>;
}

function StatCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <article className={joinClasses("stat-card", `stat-card-${tone}`)}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-detail">{detail}</p>
    </article>
  );
}

function ProviderCard({ name, kind, status, endpoint, owner, lastSync, note }: ProviderConnection) {
  return (
    <article className="surface-card provider-card">
      <div className="provider-card__top">
        <div>
          <p className="card-kicker">{kind}</p>
          <h3>{name}</h3>
        </div>
        <TonePill
          tone={
            status === "connected" || status === "paired"
              ? "success"
              : status === "degraded"
                ? "warning"
                : "info"
          }
        >
          {status}
        </TonePill>
      </div>
      <dl className="metadata-grid">
        <div>
          <dt>Endpoint</dt>
          <dd>{endpoint}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>{owner}</dd>
        </div>
        <div>
          <dt>Last sync</dt>
          <dd>{lastSync}</dd>
        </div>
      </dl>
      <p className="surface-note">{note}</p>
    </article>
  );
}

function PolicyCard({ name, mode, summary, enforcement }: ReviewPolicyRule) {
  const pillTone = mode === "allow" ? "success" : mode === "review" ? "warning" : "danger";

  return (
    <article className="surface-card policy-card">
      <div className="policy-card__top">
        <h3>{name}</h3>
        <TonePill tone={pillTone}>{mode}</TonePill>
      </div>
      <p>{summary}</p>
      <p className="surface-note">{enforcement}</p>
    </article>
  );
}

function RunListItem({
  run,
  selected,
  onSelect,
}: {
  run: ReviewRun;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={joinClasses("run-list-item", selected && "run-list-item-selected")}
        onClick={onSelect}
        aria-pressed={selected}
      >
        <div className="run-list-item__top">
          <div>
            <p className="card-kicker">{run.source}</p>
            <h3>{run.title}</h3>
          </div>
          <TonePill
            tone={
              run.status === "closed"
                ? "success"
                : run.status === "needs-attention"
                  ? "danger"
                  : "warning"
            }
          >
            {run.status}
          </TonePill>
        </div>
        <div className="run-list-item__meta">
          <span>{run.priority}</span>
          <span>{run.startedAt}</span>
          <span>{run.duration}</span>
        </div>
      </button>
    </li>
  );
}

function SignalCard({ name, value, tone, note }: MonitoringSignal) {
  return (
    <article className="surface-card signal-card">
      <div className="signal-card__top">
        <p className="card-kicker">{name}</p>
        <TonePill tone={tone}>{tone}</TonePill>
      </div>
      <p className="signal-value">{value}</p>
      <p className="surface-note">{note}</p>
    </article>
  );
}

export function App() {
  const [workspace, setWorkspace] = useState(createShellReviewerWorkspace);
  const [activeRunId, setActiveRunId] = useState(() => workspace.reviewRuns[0]?.id ?? "");

  useEffect(() => {
    let cancelled = false;

    loadReviewerWorkspaceState()
      .then((nextWorkspace) => {
        if (!cancelled) {
          setWorkspace(nextWorkspace);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkspace(createShellReviewerWorkspace());
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeRun =
    workspace.reviewRuns.find((run) => run.id === activeRunId) ?? workspace.reviewRuns[0];

  if (!activeRun) {
    throw new Error("Missing active review run");
  }

  return (
    <main className="app-shell">
      <div className="app-frame">
        <aside className="sidebar">
          <div className="brand-block">
            <p className="eyebrow">LifeOS</p>
            <h1>LifeOS Reviewer workspace</h1>
            <p className="brand-copy">
              A dense, typed surface for review triage, provider health, policy settings, and
              operational follow-through.
            </p>
          </div>

          <nav className="sidebar-nav" aria-label="Workspace navigation">
            <a href="#overview">Overview</a>
            <a href="#providers">Providers</a>
            <a href="#policy">Review policy</a>
            <a href="#runs">Review runs</a>
            <a href="#ops">Monitoring / ops</a>
          </nav>

          <div className="sidebar-card">
            <p className="card-kicker">Operating mode</p>
            <h2>
              {workspace.liveSource === "live"
                ? "Live API-backed state"
                : workspace.liveSource === "partial"
                  ? "Live API with shell fallbacks"
                  : "Mocked state only"}
            </h2>
            <p className="surface-note">
              {workspace.liveSource === "live"
                ? "Reviewer data is loading from /providers and /reviews."
                : workspace.liveSource === "partial"
                  ? "Reviewer data is partially live. Missing server detail still falls back to the shell."
                  : "These screens use local data shapes that will map cleanly to Convex, the local bridge, and policy gates later."}
            </p>
          </div>
        </aside>

        <section className="workspace">
          <header className="hero-card">
            <div className="hero-copy">
              <p className="eyebrow">Reviewer surface skeleton</p>
              <h2>Operational review flows with fail-closed boundaries.</h2>
              <p>
                LifeOS Reviewer keeps the human review loop explicit: provider connections, policy
                settings, review runs, and ops telemetry all stay typed and ready for backend
                wiring.
              </p>
            </div>

            <div className="hero-side">
              <TonePill tone="success">Local-first</TonePill>
              <TonePill
                tone={
                  workspace.liveSource === "live"
                    ? "success"
                    : workspace.liveSource === "partial"
                      ? "warning"
                      : "info"
                }
              >
                {workspace.liveSource === "live"
                  ? "Live API"
                  : workspace.liveSource === "partial"
                    ? "Partial API"
                    : "Backend pending"}
              </TonePill>
              <TonePill tone="info">Policy-gated</TonePill>
              <div className="hero-card__note">
                Raw sensitive data never crosses the boundary here. Only derived review state and
                status summaries do.{" "}
                {workspace.loadErrors.length > 0
                  ? `Live loading fell back for: ${workspace.loadErrors.join("; ")}`
                  : "Live API loading is healthy when the reviewer service is available."}
              </div>
            </div>
          </header>

          <section className="metric-grid" aria-label="Overview metrics">
            {workspace.overviewStats.map((stat: OverviewStat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </section>

          <section className="panel" id="overview">
            <SectionHeading
              eyebrow="Overview / dashboard shell"
              title="Daily review posture"
              copy="A morning scan of queue pressure, provider health, and policy friction before anyone opens a run."
            />
            <div className="overview-grid">
              <article className="surface-card summary-card">
                <p className="card-kicker">Today’s focus</p>
                <h3>3 runs need attention before noon</h3>
                <p>
                  The onboarding sweep, bridge health audit, and dependency bump are the active work
                  items in this mock workspace.
                </p>
              </article>
              <article className="surface-card summary-card">
                <p className="card-kicker">Policy posture</p>
                <h3>Restricted data stays local by default</h3>
                <p>
                  The reviewer UI only shows derived summaries for protected domains and surfaces
                  the exact rule that blocked each escalation.
                </p>
              </article>
              <article className="surface-card summary-card">
                <p className="card-kicker">Next action</p>
                <h3>Open the highest-severity review run</h3>
                <p>The queue is organized for fast triage, not conversational wandering.</p>
              </article>
            </div>
          </section>

          <section className="panel" id="providers">
            <SectionHeading
              eyebrow="Provider connection / settings shell"
              title="Connected providers and trust posture"
              copy="Connection state, sync freshness, and ownership are visible up front so operators can see which lanes are healthy."
            />
            <div className="card-grid">
              {workspace.providerConnections.map((provider) => (
                <ProviderCard key={provider.id} {...provider} />
              ))}
            </div>
          </section>

          <section className="panel" id="policy">
            <SectionHeading
              eyebrow="Review policy / settings shell"
              title="Policy rules are explicit, typed, and fail closed"
              copy="Every automated path should know whether it is allowed, review-only, or denied before it can act."
            />
            <div className="policy-grid">
              {workspace.reviewPolicyRules.map((rule) => (
                <PolicyCard key={rule.id} {...rule} />
              ))}
            </div>
          </section>

          <section className="panel" id="runs">
            <SectionHeading
              eyebrow="Review runs list / detail shell"
              title="Run queue, evidence, and reviewer detail"
              copy="The list on the left stays compact, while the detail pane on the right shows findings, checkpoints, and the recommended next action."
            />
            <div className="runs-layout">
              <ul className="run-list" aria-label="Review runs list">
                {workspace.reviewRuns.map((run) => (
                  <RunListItem
                    key={run.id}
                    run={run}
                    selected={run.id === activeRun.id}
                    onSelect={() => setActiveRunId(run.id)}
                  />
                ))}
              </ul>

              <article className="surface-card run-detail" aria-live="polite">
                <div className="run-detail__top">
                  <div>
                    <p className="card-kicker">{activeRun.source}</p>
                    <h3>{activeRun.title}</h3>
                  </div>
                  <TonePill
                    tone={
                      activeRun.status === "closed"
                        ? "success"
                        : activeRun.status === "needs-attention"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {activeRun.status}
                  </TonePill>
                </div>

                <div className="metadata-grid metadata-grid--detail">
                  <div>
                    <dt>Priority</dt>
                    <dd>{activeRun.priority}</dd>
                  </div>
                  <div>
                    <dt>Started</dt>
                    <dd>{activeRun.startedAt}</dd>
                  </div>
                  <div>
                    <dt>Reviewer</dt>
                    <dd>{activeRun.reviewer}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{activeRun.duration}</dd>
                  </div>
                </div>

                <p className="surface-note">{activeRun.summary}</p>

                {workspace.liveSource !== "fallback" && activeRun.findings.length === 0 ? (
                  <div className="hero-card__note">
                    Live API fallback: structured findings and checkpoints are still shell-backed
                    until the server exposes review detail contracts.
                  </div>
                ) : null}

                <div className="detail-columns">
                  <section>
                    <h4>Findings</h4>
                    <div className="finding-list">
                      {activeRun.findings.length === 0 ? (
                        <p className="surface-note">
                          No findings yet. This queue item is still waiting on an automated pass.
                        </p>
                      ) : (
                        activeRun.findings.map((finding) => (
                          <article key={finding.title} className="finding-card">
                            <div className="finding-card__top">
                              <TonePill
                                tone={
                                  finding.severity === "high"
                                    ? "danger"
                                    : finding.severity === "medium"
                                      ? "warning"
                                      : "info"
                                }
                              >
                                {finding.severity}
                              </TonePill>
                              <h5>{finding.title}</h5>
                            </div>
                            <p>{finding.rationale}</p>
                            <p className="surface-note">{finding.recommendation}</p>
                          </article>
                        ))
                      )}
                    </div>
                  </section>

                  <section>
                    <h4>Checkpoints</h4>
                    <ul className="checkpoint-list">
                      {activeRun.checkpoints.map((checkpoint) => (
                        <li key={checkpoint}>{checkpoint}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              </article>
            </div>
          </section>

          <section className="panel" id="ops">
            <SectionHeading
              eyebrow="Monitoring / ops shell"
              title="Operational health and recent events"
              copy="This view keeps the queue, the bridge, and the reviewer automation honest without exposing raw restricted payloads."
            />
            <div className="ops-grid">
              {workspace.monitoringSignals.map((signal) => (
                <SignalCard key={signal.name} {...signal} />
              ))}
            </div>

            <article className="surface-card ops-stream">
              <div className="run-detail__top">
                <div>
                  <p className="card-kicker">Recent activity</p>
                  <h3>What happened in the last hour</h3>
                </div>
                <TonePill tone="info">Auditable</TonePill>
              </div>
              <ul className="event-list">
                {workspace.opsEvents.map((event) => (
                  <li key={event.time + event.title} className="event-list__item">
                    <span className="event-time">{event.time}</span>
                    <div>
                      <p>{event.title}</p>
                      <p className="surface-note">{event.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </section>
      </div>
    </main>
  );
}
