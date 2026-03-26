import { describe, expect, it, vi } from "vitest";
import { listReviewJobs, replaceReviewJobState } from "./review";

type ReviewJobRow = {
  readonly _id: string;
  readonly createdAt: string;
  readonly publication?: {
    readonly inlineCommentUrls: readonly string[];
  };
  readonly status: string;
  readonly title: string;
};

function createListCtx(reviewJobs: readonly ReviewJobRow[]) {
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

const listReviewJobsHandler = listReviewJobs as typeof listReviewJobs & {
  _handler: (
    ctx: ReturnType<typeof createListCtx>,
    args: Record<string, never>,
  ) => Promise<
    {
      id: string;
      createdAt: string;
      publication: {
        inlineCommentUrls: readonly string[];
      };
      status: string;
      title: string;
    }[]
  >;
};

const replaceReviewJobStateHandler = replaceReviewJobState as typeof replaceReviewJobState & {
  _handler: (
    ctx: {
      readonly auth: {
        getUserIdentity: () => Promise<unknown>;
      };
      readonly db: {
        readonly patch: (id: string, value: Record<string, unknown>) => Promise<void>;
      };
    },
    args: {
      readonly reviewJobId: string;
      readonly job: Record<string, unknown>;
    },
  ) => Promise<null>;
};

describe("Convex review persistence helpers", () => {
  it("lists review jobs in created-at order and normalizes publication state", async () => {
    const jobs = await listReviewJobsHandler._handler(
      createListCtx([
        {
          _id: "reviewJobs:2",
          createdAt: "2026-03-24T20:01:00.000Z",
          status: "published",
          title: "Later job",
        },
        {
          _id: "reviewJobs:1",
          createdAt: "2026-03-24T20:00:00.000Z",
          publication: {
            inlineCommentUrls: ["https://example.test/inline"],
          },
          status: "queued",
          title: "Earlier job",
        },
      ]),
      {},
    );

    expect(jobs).toEqual([
      {
        id: "reviewJobs:1",
        createdAt: "2026-03-24T20:00:00.000Z",
        publication: {
          inlineCommentUrls: ["https://example.test/inline"],
        },
        status: "queued",
        title: "Earlier job",
      },
      {
        id: "reviewJobs:2",
        createdAt: "2026-03-24T20:01:00.000Z",
        publication: {
          inlineCommentUrls: [],
        },
        status: "published",
        title: "Later job",
      },
    ]);
  });

  it("patches review job state without writing undefined fields back", async () => {
    const patch = vi.fn();
    const ctx = {
      auth: {
        async getUserIdentity() {
          return { subject: "test-user", tokenIdentifier: "test" };
        },
      },
      db: {
        patch,
      },
    } as const;

    await replaceReviewJobStateHandler._handler(ctx, {
      reviewJobId: "reviewJobs:1",
      job: {
        status: "published",
        updatedAt: "2026-03-24T20:03:00.000Z",
        publication: {
          inlineCommentUrls: ["https://example.test/summary"],
        },
      },
    });

    expect(patch).toHaveBeenCalledWith("reviewJobs:1", {
      status: "published",
      updatedAt: "2026-03-24T20:03:00.000Z",
      publication: {
        inlineCommentUrls: ["https://example.test/summary"],
      },
    });
  });
});
