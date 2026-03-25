import { describe, expect, it, vi } from "vitest";
import { executeReviewJob } from "./executor";
import { enqueueReviewJob, getReviewJob, resetReviewStateForTests } from "./store";
import type { GitHubReviewJobDraft } from "./types";

function createQueuedJob(overrides: Partial<GitHubReviewJobDraft> = {}) {
  return enqueueReviewJob(
    {
      provider: "github",
      deliveryId: "delivery-22",
      repository: "shaunberkley/lifeos",
      pullRequestNumber: 22,
      pullRequestTitle: "LifeOS Reviewer execution",
      pullRequestUrl: "https://github.com/shaunberkley/lifeos/pull/22",
      headSha: "stale-head-sha",
      baseSha: "base-sha",
      action: "opened",
      draft: false,
      author: "shaunberkley",
      idempotencyKey: "delivery-22:shaunberkley/lifeos:22:stale-head-sha:opened",
      eventType: "github.pull_request.opened",
      ...overrides,
    },
    () => "2026-03-24T20:00:00.000Z",
  );
}

describe("executeReviewJob", () => {
  it("publishes inline comments against the live pull request head sha", async () => {
    resetReviewStateForTests();
    const job = createQueuedJob();
    expect(job).toBeDefined();
    const reviewId = job?.id;

    if (!reviewId) {
      throw new Error("Expected queued review job to exist.");
    }

    const publishReview = vi.fn(async () => ({
      inlineCommentUrls: ["https://example.test/inline"],
      summaryCommentUrl: "https://example.test/summary",
    }));

    await executeReviewJob(reviewId, "/repo", {
      ghClient: {
        async readPullRequest() {
          return {
            pullRequest: {
              number: 22,
              repo: "shaunberkley/lifeos",
              headSha: "live-head-sha",
              title: "LifeOS Reviewer execution",
            },
            changedFiles: [],
            commits: ["live-head-sha"],
          };
        },
        async readDiff() {
          return "diff --git";
        },
      },
      runner: {
        async runSpecialist(input) {
          return {
            passId: input.definition.id,
            kind: input.definition.kind,
            model: "codex-test",
            durationMs: 1,
            findings: [
              {
                severity: "high",
                title: "Finding",
                rationale: "Rationale",
                suggestedFix: "Fix it",
                filePath: "apps/server/src/github/executor.ts",
                line: 10,
              },
            ],
            rawOutput: "{}",
          };
        },
      },
      publishService: {
        publishReview,
      },
    });

    expect(publishReview).toHaveBeenCalledWith(
      expect.objectContaining({
        headSha: "live-head-sha",
      }),
      expect.any(Object),
    );
    expect(getReviewJob(reviewId)).toMatchObject({
      status: "published",
      publication: {
        summaryCommentUrl: "https://example.test/summary",
      },
    });
  });
});
