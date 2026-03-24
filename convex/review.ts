import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

const providerKind = v.union(
  v.literal("codex"),
  v.literal("claude"),
  v.literal("cursor"),
  v.literal("github"),
  v.literal("manual"),
);

const reviewCommentVisibility = v.union(v.literal("internal"), v.literal("public"));

async function getOrCreateWorkspace(ctx: any) {
  const existing = await ctx.db
    .query("workspaces")
    .withIndex("by_slug", (query: any) => query.eq("slug", "lifeos"))
    .first();

  if (existing) {
    return existing._id;
  }

  return ctx.db.insert("workspaces", {
    slug: "lifeos",
    name: "LifeOS",
    createdBy: "system:lifeos-reviewer",
  });
}

async function getOrCreateReviewProvider(ctx: any, workspaceId: any, kind: "github" | "codex") {
  const key = `${kind}-dogfood`;
  const existing = await ctx.db
    .query("reviewProviders")
    .withIndex("by_workspace_key", (query: any) =>
      query.eq("workspaceId", workspaceId).eq("key", key),
    )
    .first();

  if (existing) {
    return existing._id;
  }

  return ctx.db.insert("reviewProviders", {
    workspaceId,
    key,
    name: kind === "github" ? "GitHub Dogfood" : "Codex Dogfood",
    kind,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function getOrCreateReviewPolicy(ctx: any, workspaceId: any, reviewProviderId: any) {
  const existing = await ctx.db
    .query("reviewPolicies")
    .withIndex("by_workspace_key", (query: any) =>
      query.eq("workspaceId", workspaceId).eq("key", "lifeos-reviewer-dogfood"),
    )
    .first();

  if (existing) {
    return existing._id;
  }

  return ctx.db.insert("reviewPolicies", {
    workspaceId,
    key: "lifeos-reviewer-dogfood",
    name: "LifeOS Reviewer Dogfood PR Review",
    scopeKind: "workspace",
    mode: "advisory",
    targetKind: "pull_request",
    reviewProviderId,
    minBlockingSeverity: "high",
    requiresHumanApproval: false,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function getOrCreateReviewerIdentity(ctx: any, workspaceId: any, reviewProviderId: any) {
  const existing = await ctx.db
    .query("reviewerIdentities")
    .withIndex("by_workspace_handle", (query: any) =>
      query.eq("workspaceId", workspaceId).eq("handle", "lifeos-reviewer"),
    )
    .first();

  if (existing) {
    return existing._id;
  }

  return ctx.db.insert("reviewerIdentities", {
    workspaceId,
    reviewProviderId,
    externalId: "lifeos-reviewer",
    displayName: "LifeOS Reviewer",
    handle: "lifeos-reviewer",
    kind: "system",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export const upsertGithubPullRequestReviewJob = mutationGeneric({
  args: {
    repository: v.string(),
    pullRequestNumber: v.number(),
    pullRequestTitle: v.string(),
    pullRequestUrl: v.string(),
    headSha: v.string(),
    baseSha: v.string(),
    action: v.string(),
    draft: v.boolean(),
    author: v.string(),
    deliveryId: v.string(),
    eventType: v.string(),
    idempotencyKey: v.string(),
  },
  returns: v.object({
    reviewId: v.id("reviewJobs"),
    runId: v.id("reviewRuns"),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reviewJobs")
      .withIndex("by_idempotency_key", (query) => query.eq("idempotencyKey", args.idempotencyKey))
      .first();

    if (existing) {
      const run = await ctx.db
        .query("reviewRuns")
        .withIndex("by_review_job", (query) => query.eq("reviewJobId", existing._id))
        .order("desc")
        .first();

      if (!run) {
        throw new Error("Review job exists without a review run.");
      }

      return {
        reviewId: existing._id,
        runId: run._id,
        created: false,
      };
    }

    const workspaceId = await getOrCreateWorkspace(ctx);
    const reviewProviderId = await getOrCreateReviewProvider(ctx, workspaceId, "github");
    const reviewPolicyId = await getOrCreateReviewPolicy(ctx, workspaceId, reviewProviderId);
    const reviewerIdentityId = await getOrCreateReviewerIdentity(ctx, workspaceId, reviewProviderId);
    const createdAt = new Date().toISOString();

    const reviewJobId = await ctx.db.insert("reviewJobs", {
      workspaceId,
      reviewPolicyId,
      reviewProviderId,
      requestedByReviewerIdentityId: reviewerIdentityId,
      targetKind: "pull_request",
      targetRef: `${args.repository}#${args.pullRequestNumber}`,
      title: args.pullRequestTitle,
      priority: "normal",
      status: "queued",
      deliveryId: args.deliveryId,
      eventType: args.eventType,
      idempotencyKey: args.idempotencyKey,
      repository: args.repository,
      pullRequestNumber: args.pullRequestNumber,
      pullRequestUrl: args.pullRequestUrl,
      headSha: args.headSha,
      baseSha: args.baseSha,
      author: args.author,
      draft: args.draft,
      createdAt,
      updatedAt: createdAt,
    });

    const runId = await ctx.db.insert("reviewRuns", {
      workspaceId,
      reviewJobId,
      reviewProviderId,
      reviewerIdentityId,
      attemptNumber: 1,
      runnerVersion: "lifeos-reviewer-codex-mvp",
      status: "queued",
      startedAt: createdAt,
      summary: undefined,
      createdAt,
      updatedAt: createdAt,
    });

    return {
      reviewId: reviewJobId,
      runId,
      created: true,
    };
  },
});

export const listQueuedReviewJobs = queryGeneric({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("reviewJobs"),
      repository: v.string(),
      pullRequestNumber: v.number(),
      pullRequestTitle: v.string(),
      pullRequestUrl: v.string(),
      headSha: v.string(),
      baseSha: v.string(),
      author: v.string(),
      draft: v.boolean(),
      eventType: v.optional(v.string()),
      status: v.string(),
      createdAt: v.string(),
      updatedAt: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const jobs = await ctx.db
      .query("reviewJobs")
      .withIndex("by_workspace_status", (query) => query.eq("status", "queued"))
      .collect();

    return jobs
      .filter((job) => job.repository && job.pullRequestNumber && job.pullRequestUrl)
      .map((job) => ({
        id: job._id,
        repository: job.repository ?? "",
        pullRequestNumber: job.pullRequestNumber ?? 0,
        pullRequestTitle: job.title,
        pullRequestUrl: job.pullRequestUrl ?? "",
        headSha: job.headSha ?? "",
        baseSha: job.baseSha ?? "",
        author: job.author ?? "",
        draft: job.draft ?? false,
        eventType: job.eventType,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      }));
  },
});

export const getReviewJob = queryGeneric({
  args: {
    reviewJobId: v.id("reviewJobs"),
  },
  returns: v.union(
    v.null(),
    v.object({
      id: v.id("reviewJobs"),
      repository: v.optional(v.string()),
      pullRequestNumber: v.optional(v.number()),
      pullRequestTitle: v.string(),
      pullRequestUrl: v.optional(v.string()),
      headSha: v.optional(v.string()),
      baseSha: v.optional(v.string()),
      author: v.optional(v.string()),
      draft: v.optional(v.boolean()),
      eventType: v.optional(v.string()),
      status: v.string(),
      createdAt: v.string(),
      updatedAt: v.string(),
      comments: v.array(
        v.object({
          id: v.id("reviewComments"),
          body: v.string(),
          visibility: reviewCommentVisibility,
          createdAt: v.string(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.reviewJobId);
    if (!job) {
      return null;
    }

    const comments = await ctx.db
      .query("reviewComments")
      .withIndex("by_review_job", (query) => query.eq("reviewJobId", args.reviewJobId))
      .collect();

    return {
      id: job._id,
      repository: job.repository,
      pullRequestNumber: job.pullRequestNumber,
      pullRequestTitle: job.title,
      pullRequestUrl: job.pullRequestUrl,
      headSha: job.headSha,
      baseSha: job.baseSha,
      author: job.author,
      draft: job.draft,
      eventType: job.eventType,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      comments: comments.map((comment) => ({
        id: comment._id,
        body: comment.body,
        visibility: comment.visibility,
        createdAt: comment.createdAt,
      })),
    };
  },
});

export const publishReviewResult = mutationGeneric({
  args: {
    reviewJobId: v.id("reviewJobs"),
    summaryBody: v.string(),
    inlineComments: v.array(
      v.object({
        path: v.string(),
        line: v.number(),
        side: v.union(v.literal("LEFT"), v.literal("RIGHT")),
        body: v.string(),
      }),
    ),
  },
  returns: v.object({
    reviewJobId: v.id("reviewJobs"),
    commentCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.reviewJobId);
    if (!job) {
      throw new Error("Review job not found.");
    }

    const run = await ctx.db
      .query("reviewRuns")
      .withIndex("by_review_job", (query) => query.eq("reviewJobId", args.reviewJobId))
      .order("desc")
      .first();

    if (!run) {
      throw new Error("Review run not found.");
    }

    const updatedAt = new Date().toISOString();

    await ctx.db.patch(args.reviewJobId, {
      status: "completed",
      updatedAt,
    });

    await ctx.db.patch(run._id, {
      status: "passed",
      summary: args.summaryBody,
      finishedAt: updatedAt,
      updatedAt,
    });

    await ctx.db.insert("reviewComments", {
      workspaceId: job.workspaceId,
      reviewJobId: args.reviewJobId,
      reviewRunId: run._id,
      body: args.summaryBody,
      visibility: "public",
      createdAt: updatedAt,
      updatedAt,
    });

    for (const [index, comment] of args.inlineComments.entries()) {
      const findingId = await ctx.db.insert("reviewFindings", {
        workspaceId: job.workspaceId,
        reviewJobId: args.reviewJobId,
        reviewRunId: run._id,
        title: `Inline review comment ${index + 1}`,
        detail: comment.body,
        severity: "medium",
        status: "open",
        filePath: comment.path,
        lineStart: comment.line,
        lineEnd: comment.line,
        recommendation: comment.body,
        fingerprint: `${comment.path}:${comment.line}:${index}`,
        createdAt: updatedAt,
        updatedAt,
      });

      await ctx.db.insert("reviewComments", {
        workspaceId: job.workspaceId,
        reviewJobId: args.reviewJobId,
        reviewRunId: run._id,
        reviewFindingId: findingId,
        body: comment.body,
        visibility: "public",
        createdAt: updatedAt,
        updatedAt,
      });
    }

    return {
      reviewJobId: args.reviewJobId,
      commentCount: args.inlineComments.length + 1,
    };
  },
});
