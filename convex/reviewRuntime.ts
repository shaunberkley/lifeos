import { queryGeneric } from "convex/server";
import { v } from "convex/values";

export const reviewRuntimeSummary = queryGeneric({
  args: {},
  returns: v.object({
    reviewArtifactCount: v.number(),
    reviewCommentCount: v.number(),
    reviewFindingCount: v.number(),
    reviewJobCount: v.number(),
    reviewPolicyCount: v.number(),
    reviewProviderCount: v.number(),
    reviewRunCount: v.number(),
    reviewerIdentityCount: v.number(),
  }),
  handler: async (ctx) => {
    const [
      reviewProviders,
      reviewerIdentities,
      reviewPolicies,
      reviewJobs,
      reviewRuns,
      reviewFindings,
      reviewArtifacts,
      reviewComments,
    ] = await Promise.all([
      ctx.db.query("reviewProviders").collect(),
      ctx.db.query("reviewerIdentities").collect(),
      ctx.db.query("reviewPolicies").collect(),
      ctx.db.query("reviewJobs").collect(),
      ctx.db.query("reviewRuns").collect(),
      ctx.db.query("reviewFindings").collect(),
      ctx.db.query("reviewArtifacts").collect(),
      ctx.db.query("reviewComments").collect(),
    ]);

    return {
      reviewArtifactCount: reviewArtifacts.length,
      reviewCommentCount: reviewComments.length,
      reviewFindingCount: reviewFindings.length,
      reviewJobCount: reviewJobs.length,
      reviewPolicyCount: reviewPolicies.length,
      reviewProviderCount: reviewProviders.length,
      reviewRunCount: reviewRuns.length,
      reviewerIdentityCount: reviewerIdentities.length,
    };
  },
});
