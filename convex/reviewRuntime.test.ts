import { describe, expect, it } from "vitest";
import { reviewRuntimeSummary } from "./reviewRuntime";

type TableName =
  | "reviewArtifacts"
  | "reviewComments"
  | "reviewFindings"
  | "reviewJobs"
  | "reviewPolicies"
  | "reviewProviders"
  | "reviewRuns"
  | "reviewerIdentities";

type InMemoryTables = {
  [K in TableName]: readonly unknown[];
};

function createQueryCtx(tables: InMemoryTables) {
  return {
    db: {
      query(tableName: TableName) {
        return {
          async collect() {
            return tables[tableName];
          },
        };
      },
    },
  } as const;
}

const reviewRuntimeSummaryHandler = reviewRuntimeSummary as typeof reviewRuntimeSummary & {
  _handler: (
    ctx: ReturnType<typeof createQueryCtx>,
    args: Record<string, never>,
  ) => Promise<{
    reviewArtifactCount: number;
    reviewCommentCount: number;
    reviewFindingCount: number;
    reviewJobCount: number;
    reviewPolicyCount: number;
    reviewProviderCount: number;
    reviewRunCount: number;
    reviewerIdentityCount: number;
  }>;
};

describe("Convex reviewRuntimeSummary", () => {
  it("reads the review data model tables through the registered Convex query wrapper", async () => {
    const emptyCtx = createQueryCtx({
      reviewArtifacts: [],
      reviewComments: [],
      reviewFindings: [],
      reviewJobs: [],
      reviewPolicies: [],
      reviewProviders: [],
      reviewRuns: [],
      reviewerIdentities: [],
    });

    await expect(reviewRuntimeSummaryHandler._handler(emptyCtx, {})).resolves.toEqual({
      reviewArtifactCount: 0,
      reviewCommentCount: 0,
      reviewFindingCount: 0,
      reviewJobCount: 0,
      reviewPolicyCount: 0,
      reviewProviderCount: 0,
      reviewRunCount: 0,
      reviewerIdentityCount: 0,
    });

    const populatedCtx = createQueryCtx({
      reviewArtifacts: [{ _id: "reviewArtifacts:1", _creationTime: 0 }],
      reviewComments: [{ _id: "reviewComments:1", _creationTime: 0 }],
      reviewFindings: [{ _id: "reviewFindings:1", _creationTime: 0 }],
      reviewJobs: [{ _id: "reviewJobs:1", _creationTime: 0 }],
      reviewPolicies: [{ _id: "reviewPolicies:1", _creationTime: 0 }],
      reviewProviders: [{ _id: "reviewProviders:1", _creationTime: 0 }],
      reviewRuns: [{ _id: "reviewRuns:1", _creationTime: 0 }],
      reviewerIdentities: [{ _id: "reviewerIdentities:1", _creationTime: 0 }],
    });

    await expect(reviewRuntimeSummaryHandler._handler(populatedCtx, {})).resolves.toEqual({
      reviewArtifactCount: 1,
      reviewCommentCount: 1,
      reviewFindingCount: 1,
      reviewJobCount: 1,
      reviewPolicyCount: 1,
      reviewProviderCount: 1,
      reviewRunCount: 1,
      reviewerIdentityCount: 1,
    });
  });
});
