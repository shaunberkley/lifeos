import { spawnSync } from "node:child_process";
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

function callConvex<T>(kind: "query" | "mutation", functionName: string, args: unknown): T {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
import fs from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const url = process.env.CONVEX_URL?.trim();
if (!url) {
  throw new Error("Missing CONVEX_URL for durable review state.");
}

const input = fs.readFileSync(0, "utf8");
const args = input ? JSON.parse(input) : {};
const client = new ConvexHttpClient(url, { logger: false, skipConvexDeploymentUrlCheck: true });
const fn = makeFunctionReference(${JSON.stringify(functionName)});
const value = await client.${kind}(fn, args);
process.stdout.write(JSON.stringify(value));
      `.trim(),
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
      },
      input: JSON.stringify(args),
    },
  );

  if (result.status !== 0) {
    throw new Error(
      [`Convex ${kind} ${functionName} failed.`, result.stderr?.trim(), result.stdout?.trim()]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const stdout = result.stdout.trim();
  return stdout ? (JSON.parse(stdout) as T) : (undefined as T);
}

function hydrateDurableState() {
  if (!hasDurableReviewState()) {
    return;
  }

  const reviewJobs = callConvex<readonly GitHubReviewJob[]>("query", "review:listReviewJobs", {});
  clearReviewState();

  for (const reviewJob of reviewJobs) {
    applyReviewJob(normalizeReviewJob(reviewJob));
  }

  durableReviewStateHydrated = true;
}

function ensureDurableStateHydrated() {
  if (!hasDurableReviewState()) {
    return;
  }

  if (!durableReviewStateHydrated) {
    hydrateDurableState();
  }
}

function saveReviewJob(reviewJob: GitHubReviewJob) {
  if (!hasDurableReviewState()) {
    applyReviewJob(reviewJob);
    return;
  }

  const { comments: _comments, ...job } = reviewJob as GitHubReviewJob & {
    readonly comments?: unknown;
  };

  callConvex<null>("mutation", "review:replaceReviewJobState", {
    reviewJobId: reviewJob.id,
    job,
  });
  applyReviewJob(reviewJob);
}

export function resetReviewStateForTests() {
  clearReviewState();

  if (!hasDurableReviewState()) {
    return;
  }

  callConvex<null>("mutation", "review:resetReviewStateForTests", {});
}

export function listReviewJobs() {
  ensureDurableStateHydrated();

  return [...state.reviews.jobsById.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

export function getReviewJob(reviewId: string) {
  ensureDurableStateHydrated();
  return state.reviews.jobsById.get(reviewId);
}

export function enqueueReviewJob(
  draft: GitHubReviewJobDraft,
  now = () => new Date().toISOString(),
) {
  ensureDurableStateHydrated();

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

  const result = callConvex<{ reviewId: string; runId: string; created: boolean }>(
    "mutation",
    "review:upsertGithubPullRequestReviewJob",
    draft,
  );
  const job = callConvex<GitHubReviewJob | null>("query", "review:getReviewJob", {
    reviewJobId: result.reviewId,
  });

  if (!job) {
    throw new Error("Convex review store returned no job after enqueue.");
  }

  const normalizedJob = normalizeReviewJob(job);
  applyReviewJob(normalizedJob);
  return normalizedJob;
}

export function updateReviewJob(
  reviewId: string,
  updater: (job: GitHubReviewJob) => GitHubReviewJob,
) {
  ensureDurableStateHydrated();

  const current = state.reviews.jobsById.get(reviewId);
  if (!current) {
    return undefined;
  }

  const updated = updater(current);
  saveReviewJob(updated);
  return updated;
}

export function listProviderStatuses(providerStatus: GitHubProviderStatus) {
  return [providerStatus];
}
