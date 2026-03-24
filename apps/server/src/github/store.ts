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

export function resetReviewStateForTests() {
  state.reviews.idByIdempotencyKey.clear();
  state.reviews.jobsById.clear();
}

export function listReviewJobs() {
  return [...state.reviews.jobsById.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );
}

export function getReviewJob(reviewId: string) {
  return state.reviews.jobsById.get(reviewId);
}

export function enqueueReviewJob(
  draft: GitHubReviewJobDraft,
  now = () => new Date().toISOString(),
) {
  const existingId = state.reviews.idByIdempotencyKey.get(draft.idempotencyKey);
  if (existingId) {
    return state.reviews.jobsById.get(existingId);
  }

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

  state.reviews.idByIdempotencyKey.set(draft.idempotencyKey, job.id);
  state.reviews.jobsById.set(job.id, job);
  return job;
}

export function updateReviewJob(
  reviewId: string,
  updater: (job: GitHubReviewJob) => GitHubReviewJob,
) {
  const current = state.reviews.jobsById.get(reviewId);
  if (!current) {
    return undefined;
  }

  const updated = updater(current);
  state.reviews.jobsById.set(reviewId, updated);
  return updated;
}

export function listProviderStatuses(providerStatus: GitHubProviderStatus) {
  return [providerStatus];
}
