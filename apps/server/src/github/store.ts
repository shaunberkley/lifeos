import { randomUUID } from "node:crypto";
import type { GitHubProviderStatus, GitHubReviewJob, GitHubReviewJobDraft } from "./types";

type ReviewJobIndex = {
  readonly idByIdempotencyKey: Map<string, string>;
  readonly jobsById: Map<string, GitHubReviewJob>;
};

type InMemoryReviewState = {
  readonly reviews: ReviewJobIndex;
};

function createReviewJobIndex(): ReviewJobIndex {
  return {
    idByIdempotencyKey: new Map<string, string>(),
    jobsById: new Map<string, GitHubReviewJob>(),
  };
}

function createInitialState(): InMemoryReviewState {
  return {
    reviews: createReviewJobIndex(),
  };
}

const state = createInitialState();
let durableReviewStateHydrated = false;

function hasDurableReviewState() {
  return Boolean(process.env.CONVEX_URL?.trim());
}

function normalizeReviewJob(reviewJob: unknown): GitHubReviewJob {
  const { comments: _comments, ...job } = reviewJob as Partial<GitHubReviewJob> & {
    readonly comments?: unknown;
  };

  return {
    ...job,
    id: job.id ?? "",
    publication: job.publication ?? {
      inlineCommentUrls: [],
    },
  } as GitHubReviewJob;
}

function applyReviewJob(job: GitHubReviewJob) {
  state.reviews.jobsById.set(job.id, job);
  state.reviews.idByIdempotencyKey.set(job.idempotencyKey, job.id);
}

function clearReviewState() {
  state.reviews.idByIdempotencyKey.clear();
  state.reviews.jobsById.clear();
  durableReviewStateHydrated = false;
}

/**
 * Call a Convex function via the HTTP API.
 * Replaces the previous subprocess-spawning approach which had code injection risks.
 */
async function callConvex<T>(
  kind: "query" | "mutation",
  functionName: string,
  args: unknown,
): Promise<T> {
  const url = process.env.CONVEX_URL?.trim();
  if (!url) {
    throw new Error("Missing CONVEX_URL for durable review state.");
  }

  const endpoint = `${url}/api/${kind}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: functionName,
      args: args ?? {},
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Convex ${kind} ${functionName} failed (${response.status}): ${body}`);
  }

  const result = await response.json();
  return result.value as T;
}

async function hydrateDurableState(): Promise<void> {
  if (!hasDurableReviewState()) {
    return;
  }

  const reviewJobs = await callConvex<readonly GitHubReviewJob[]>(
    "query",
    "review:listReviewJobs",
    {},
  );
  clearReviewState();

  for (const reviewJob of reviewJobs) {
    applyReviewJob(normalizeReviewJob(reviewJob));
  }

  durableReviewStateHydrated = true;
}

async function ensureDurableStateHydrated(): Promise<void> {
  if (!hasDurableReviewState()) {
    return;
  }

  if (!durableReviewStateHydrated) {
    await hydrateDurableState();
  }
}

async function saveReviewJob(reviewJob: GitHubReviewJob): Promise<void> {
  if (!hasDurableReviewState()) {
    applyReviewJob(reviewJob);
    return;
  }

  const { comments: _comments, ...job } = reviewJob as GitHubReviewJob & {
    readonly comments?: unknown;
  };

  await callConvex<null>("mutation", "review:replaceReviewJobState", {
    reviewJobId: reviewJob.id,
    job,
  });
  applyReviewJob(reviewJob);
}

export async function resetReviewStateForTests(): Promise<void> {
  clearReviewState();

  if (!hasDurableReviewState()) {
    return;
  }

  await callConvex<null>("mutation", "review:resetReviewStateForTests", {});
}

export async function listReviewJobs(): Promise<readonly GitHubReviewJob[]> {
  await ensureDurableStateHydrated();

  return [...state.reviews.jobsById.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

export async function getReviewJob(reviewId: string): Promise<GitHubReviewJob | undefined> {
  await ensureDurableStateHydrated();
  return state.reviews.jobsById.get(reviewId);
}

export async function enqueueReviewJob(
  draft: GitHubReviewJobDraft,
  now = () => new Date().toISOString(),
): Promise<GitHubReviewJob | undefined> {
  await ensureDurableStateHydrated();

  const existingId = state.reviews.idByIdempotencyKey.get(draft.idempotencyKey);
  if (existingId) {
    return state.reviews.jobsById.get(existingId);
  }

  if (!hasDurableReviewState()) {
    const job: GitHubReviewJob = {
      ...draft,
      id: randomUUID(),
      status: "queued",
      createdAt: now(),
      updatedAt: now(),
      publication: draft.publication ?? {
        inlineCommentUrls: [],
      },
    };

    applyReviewJob(job);
    return job;
  }

  const result = await callConvex<{ reviewId: string; runId: string; created: boolean }>(
    "mutation",
    "review:upsertGithubPullRequestReviewJob",
    draft,
  );
  const job = await callConvex<GitHubReviewJob | null>("query", "review:getReviewJob", {
    reviewJobId: result.reviewId,
  });

  if (!job) {
    throw new Error("Convex review store returned no job after enqueue.");
  }

  const normalizedJob = normalizeReviewJob(job);
  applyReviewJob(normalizedJob);
  return normalizedJob;
}

export async function updateReviewJob(
  reviewId: string,
  updater: (job: GitHubReviewJob) => GitHubReviewJob,
): Promise<GitHubReviewJob | undefined> {
  await ensureDurableStateHydrated();

  const current = state.reviews.jobsById.get(reviewId);
  if (!current) {
    return undefined;
  }

  const updated = updater(current);
  await saveReviewJob(updated);
  return updated;
}

export function listProviderStatuses(providerStatus: GitHubProviderStatus) {
  return [providerStatus];
}
