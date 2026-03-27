import { describe, expect, it } from "vitest";
import { listQueuedReviewJobs } from "./review";

function createCtx(reviewJobs: readonly Record<string, unknown>[]) {
  return {
    auth: {
      async getUserIdentity() {
        return { subject: "test-user", tokenIdentifier: "test" };
      },
    },
    db: {
      query(tableName: string) {
        if (tableName !== "reviewJobs") {
          throw new Error(`Unexpected table query: ${tableName}`);
        }

        return {
          async collect() {
            return reviewJobs;
          },
        };
      },
    },
  } as const;
}

const listQueuedReviewJobsHandler = listQueuedReviewJobs as typeof listQueuedReviewJobs & {
  _handler: (
    ctx: ReturnType<typeof createCtx>,
    args: Record<string, never>,
  ) => Promise<
    {
      id: string;
      repository: string;
      pullRequestNumber: number;
      pullRequestTitle: string;
      pullRequestUrl: string;
      headSha: string;
      baseSha: string;
      author: string;
      draft: boolean;
      eventType?: string;
      status: string;
      createdAt: string;
      updatedAt: string;
    }[]
  >;
};

describe("Convex listQueuedReviewJobs", () => {
  it("collects jobs and returns only queued pull request review jobs", async () => {
    const jobs = await listQueuedReviewJobsHandler._handler(
      createCtx([
        {
          _id: "reviewJobs:1",
          status: "queued",
          repository: "shaunberkley/lifeos",
          pullRequestNumber: 151,
          title: "LifeOS Reviewer foundation",
          pullRequestUrl: "https://github.com/shaunberkley/lifeos/pull/151",
          headSha: "head-1",
          baseSha: "base-1",
          author: "shaunberkley",
          draft: false,
          eventType: "github.pull_request.opened",
          createdAt: "2026-03-24T20:00:00.000Z",
          updatedAt: "2026-03-24T20:00:00.000Z",
        },
        {
          _id: "reviewJobs:2",
          status: "completed",
          repository: "shaunberkley/lifeos",
          pullRequestNumber: 152,
          title: "Completed review",
          pullRequestUrl: "https://github.com/shaunberkley/lifeos/pull/152",
          headSha: "head-2",
          baseSha: "base-2",
          author: "shaunberkley",
          draft: false,
          createdAt: "2026-03-24T20:01:00.000Z",
          updatedAt: "2026-03-24T20:01:00.000Z",
        },
      ]),
      {},
    );

    expect(jobs).toEqual([
      {
        id: "reviewJobs:1",
        repository: "shaunberkley/lifeos",
        pullRequestNumber: 151,
        pullRequestTitle: "LifeOS Reviewer foundation",
        pullRequestUrl: "https://github.com/shaunberkley/lifeos/pull/151",
        headSha: "head-1",
        baseSha: "base-1",
        author: "shaunberkley",
        draft: false,
        eventType: "github.pull_request.opened",
        status: "queued",
        createdAt: "2026-03-24T20:00:00.000Z",
        updatedAt: "2026-03-24T20:00:00.000Z",
      },
    ]);
  });
});
