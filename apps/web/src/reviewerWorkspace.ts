import type { ReviewerApiSnapshot, ReviewerProviderStatus, ReviewerReviewJob } from "./reviewerApi";
import { loadReviewerApiSnapshot } from "./reviewerApi";
import {
  type MonitoringSignal,
  type OpsEvent,
  type OverviewStat,
  type ProviderConnection,
  type ReviewPolicyRule,
  type ReviewRun,
  monitoringSignals,
  opsEvents,
  overviewStats,
  providerConnections,
  reviewPolicyRules,
  reviewRuns,
} from "./reviewerData";

export type ReviewerWorkspaceState = {
  readonly overviewStats: readonly OverviewStat[];
  readonly providerConnections: readonly ProviderConnection[];
  readonly reviewPolicyRules: readonly ReviewPolicyRule[];
  readonly reviewRuns: readonly ReviewRun[];
  readonly monitoringSignals: readonly MonitoringSignal[];
  readonly opsEvents: readonly OpsEvent[];
  readonly liveSource: ReviewerApiSnapshot["source"];
  readonly loadErrors: readonly string[];
};

const fallbackStatus = {
  liveSource: "fallback" as const,
  loadErrors: [] as const,
};

function cloneArray<T>(values: readonly T[]) {
  return [...values];
}

function formatLiveTime(isoValue: string) {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return isoValue;
  }

  return `${date.toISOString().slice(11, 16)} UTC`;
}

function formatLiveDuration(startedAt: string, finishedAt?: string) {
  if (!finishedAt) {
    return "live";
  }

  const started = new Date(startedAt).getTime();
  const ended = new Date(finishedAt).getTime();

  if (Number.isNaN(started) || Number.isNaN(ended) || ended < started) {
    return "live";
  }

  const minutes = Math.max(1, Math.round((ended - started) / 60000));
  return `${minutes}m`;
}

function mapLiveProvider(
  status: ReviewerProviderStatus,
  fallback: ProviderConnection,
): ProviderConnection {
  return {
    ...fallback,
    name: status.displayName,
    status: status.webhookConfigured && status.publishConfigured ? "connected" : "degraded",
    endpoint: status.webhookConfigured
      ? `${status.webhookEndpoint} · ${status.reviewRoutes.list}`
      : "GitHub API unavailable",
    owner: status.repository ?? fallback.owner,
    lastSync: status.publishConfigured ? "live" : "needs config",
    note: status.publishConfigured
      ? "Live GitHub reviewer routes are connected; review jobs are loading from the API."
      : "GitHub reviewer routes are only partially configured; using shell state for the missing pieces.",
  };
}

function mapLiveReview(job: ReviewerReviewJob): ReviewRun {
  const completedAt = job.publication?.publishedAt;
  const sourceLabel = job.status === "published" ? "GitHub API" : "GitHub API";
  const shellPriority = job.status === "failed" ? "P0" : job.draft ? "P1" : "P2";

  return {
    id: job.id,
    title: job.pullRequestTitle,
    source: sourceLabel,
    status:
      job.status === "published"
        ? "closed"
        : job.status === "failed"
          ? "needs-attention"
          : "queued",
    priority: shellPriority,
    startedAt: formatLiveTime(job.createdAt),
    duration: formatLiveDuration(job.createdAt, completedAt),
    reviewer: "LifeOS Reviewer",
    summary:
      job.status === "published"
        ? `Live GitHub review job #${job.pullRequestNumber} has been published. Structured findings are still shell-backed.`
        : `Live GitHub review job #${job.pullRequestNumber} loaded from the API. Structured findings are still shell-backed.`,
    findings: [],
    checkpoints: [
      "Loaded from /reviews",
      `Action: ${job.action}`,
      `Repository: ${job.repository}`,
      job.publication?.summaryCommentUrl ? "Summary comment published" : "Summary comment pending",
    ],
  };
}

function mergeOverviewStats(
  liveSource: ReviewerApiSnapshot["source"],
  providerConnectionsLive: readonly ProviderConnection[],
  reviewRunsLive: readonly ReviewRun[],
): OverviewStat[] {
  if (liveSource === "fallback") {
    return cloneArray(overviewStats);
  }

  return overviewStats.map((stat) => {
    if (stat.label === "Open review runs") {
      return {
        ...stat,
        value: String(reviewRunsLive.length),
        detail:
          liveSource === "live" || liveSource === "partial"
            ? "Loaded from the live /reviews endpoint. Findings still fall back to the shell until the server exposes structured detail."
            : stat.detail,
      };
    }

    if (stat.label === "Connected providers") {
      const connectedCount = providerConnectionsLive.filter(
        (provider) => provider.status === "connected" || provider.status === "paired",
      ).length;
      return {
        ...stat,
        value: `${connectedCount}/${providerConnectionsLive.length || providerConnections.length}`,
        detail:
          liveSource === "live" || liveSource === "partial"
            ? "GitHub provider status is loading from the live /providers endpoint."
            : stat.detail,
      };
    }

    return stat;
  });
}

export function createShellReviewerWorkspace(): ReviewerWorkspaceState {
  return {
    overviewStats: cloneArray(overviewStats),
    providerConnections: cloneArray(providerConnections),
    reviewPolicyRules: cloneArray(reviewPolicyRules),
    reviewRuns: cloneArray(reviewRuns),
    monitoringSignals: cloneArray(monitoringSignals),
    opsEvents: cloneArray(opsEvents),
    ...fallbackStatus,
  };
}

export function mergeLiveReviewerWorkspace(
  shell: ReviewerWorkspaceState,
  snapshot: ReviewerApiSnapshot,
): ReviewerWorkspaceState {
  const liveGitHubProvider = snapshot.providers.find((provider) => provider.provider === "github");
  const providerConnectionsLive =
    snapshot.providersLoaded && liveGitHubProvider
      ? shell.providerConnections.map((provider) =>
          provider.id === "github" ? mapLiveProvider(liveGitHubProvider, provider) : provider,
        )
      : shell.providerConnections;

  const reviewRunsLive = snapshot.reviewsLoaded
    ? snapshot.reviews.map((job) => mapLiveReview(job))
    : shell.reviewRuns;

  return {
    ...shell,
    overviewStats: mergeOverviewStats(snapshot.source, providerConnectionsLive, reviewRunsLive),
    providerConnections: providerConnectionsLive,
    reviewRuns: reviewRunsLive,
    liveSource: snapshot.source,
    loadErrors: snapshot.errors,
  };
}

export async function loadReviewerWorkspaceState(fetchImpl: typeof fetch = fetch) {
  const shell = createShellReviewerWorkspace();
  const snapshot = await loadReviewerApiSnapshot(fetchImpl);

  return mergeLiveReviewerWorkspace(shell, snapshot);
}
