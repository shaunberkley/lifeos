import { AppError, ServiceUnavailableError } from "@lifeos/logging";
import { getGitHubPublishEnvironment } from "./config";
import { createGitHubPublishService } from "./publisher";
import { enqueueReviewJob, getReviewJob, listReviewJobs, updateReviewJob } from "./store";
import type { GitHubPublishResult, GitHubPublishReviewRequest, GitHubReviewJob } from "./types";
import type { GitHubPullRequestReviewEvent } from "./webhook";

export type ReviewOrchestrator = {
  readonly enqueueGitHubPullRequestReview: (
    event: GitHubPullRequestReviewEvent,
  ) => Promise<GitHubReviewJob>;
  readonly listReviewJobs: typeof listReviewJobs;
  readonly getReviewJob: typeof getReviewJob;
  readonly publishReviewJob: (
    reviewId: string,
    request: GitHubPublishReviewRequest,
  ) => Promise<GitHubPublishResult>;
};

export function createReviewOrchestrator(now = () => new Date().toISOString()): ReviewOrchestrator {
  return {
    async enqueueGitHubPullRequestReview(event) {
      const draft = {
        provider: "github" as const,
        deliveryId: event.deliveryId,
        repository: event.repository,
        pullRequestNumber: event.pullRequestNumber,
        pullRequestTitle: event.pullRequestTitle,
        pullRequestUrl: event.pullRequestUrl,
        headSha: event.headSha,
        baseSha: event.baseSha,
        action: event.action,
        draft: event.draft,
        author: event.author,
        idempotencyKey: event.idempotencyKey,
        eventType: event.eventType,
      };

      const reviewJob = await enqueueReviewJob(draft, now);
      if (!reviewJob) {
        throw new ServiceUnavailableError("Failed to queue GitHub review job.", {
          eventType: event.eventType,
          surface: "github-review-orchestrator",
        });
      }

      return reviewJob;
    },
    listReviewJobs,
    getReviewJob,
    async publishReviewJob(reviewId, request) {
      const job = await getReviewJob(reviewId);

      if (!job) {
        throw new AppError({
          code: "not_found",
          message: "Review job not found.",
          status: 404,
          details: {
            reviewId,
            surface: "github-review-orchestrator",
          },
        });
      }

      const publisher = createGitHubPublishService(getGitHubPublishEnvironment());
      const publication = await publisher.publishReview(job, request);

      const updated = await updateReviewJob(reviewId, (current) => ({
        ...current,
        status: "published",
        updatedAt: now(),
        publication: {
          ...current.publication,
          ...publication,
          publishedAt: now(),
        },
      }));

      if (!updated) {
        throw new ServiceUnavailableError("Failed to persist GitHub review publication.", {
          reviewId,
          surface: "github-review-orchestrator",
        });
      }

      return publication;
    },
  };
}
