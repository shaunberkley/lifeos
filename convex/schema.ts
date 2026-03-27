import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const EMBEDDING_DIMS = 768 as const;

export default defineSchema({
  workspaces: defineTable({
    slug: v.string(),
    name: v.string(),
    createdBy: v.string(),
  }).index("by_slug", ["slug"]),

  connections: defineTable({
    workspaceId: v.id("workspaces"),
    provider: v.string(),
    mode: v.union(v.literal("cloud"), v.literal("local")),
    dataClass: v.union(
      v.literal("public"),
      v.literal("private"),
      v.literal("restricted"),
      v.literal("derived"),
    ),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("error")),
    externalAccountId: v.optional(v.string()),
  }).index("by_workspace", ["workspaceId"]),

  sourceEvents: defineTable({
    workspaceId: v.id("workspaces"),
    connectionId: v.id("connections"),
    idempotencyKey: v.string(),
    eventType: v.string(),
    payloadHash: v.string(),
    payloadRef: v.optional(v.string()),
    receivedAt: v.string(),
    projectionState: v.union(v.literal("pending"), v.literal("applied"), v.literal("dead_letter")),
  })
    .index("by_connection", ["connectionId", "receivedAt"])
    .index("by_idempotency", ["idempotencyKey"]),

  tasks: defineTable({
    workspaceId: v.id("workspaces"),
    title: v.string(),
    status: v.union(
      v.literal("inbox"),
      v.literal("todo"),
      v.literal("doing"),
      v.literal("done"),
      v.literal("canceled"),
    ),
    sourceEventId: v.optional(v.id("sourceEvents")),
    dueAt: v.optional(v.string()),
    updatedAt: v.string(),
  }).index("by_workspace_status", ["workspaceId", "status"]),

  reviewProviders: defineTable({
    workspaceId: v.id("workspaces"),
    key: v.string(),
    name: v.string(),
    kind: v.union(
      v.literal("codex"),
      v.literal("claude"),
      v.literal("cursor"),
      v.literal("github"),
      v.literal("manual"),
    ),
    status: v.union(v.literal("active"), v.literal("disabled"), v.literal("error")),
    baseUrl: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_key", ["workspaceId", "key"]),

  reviewerIdentities: defineTable({
    workspaceId: v.id("workspaces"),
    reviewProviderId: v.id("reviewProviders"),
    externalId: v.string(),
    displayName: v.string(),
    handle: v.string(),
    kind: v.union(v.literal("human"), v.literal("agent"), v.literal("system")),
    status: v.union(v.literal("active"), v.literal("disabled"), v.literal("revoked")),
    email: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_provider_external_id", ["reviewProviderId", "externalId"])
    .index("by_workspace_handle", ["workspaceId", "handle"]),

  reviewPolicies: defineTable({
    workspaceId: v.id("workspaces"),
    key: v.string(),
    name: v.string(),
    scopeKind: v.union(v.literal("workspace"), v.literal("provider"), v.literal("job")),
    mode: v.union(v.literal("advisory"), v.literal("required")),
    targetKind: v.union(
      v.literal("pull_request"),
      v.literal("commit"),
      v.literal("branch"),
      v.literal("patch"),
      v.literal("artifact"),
      v.literal("prompt"),
    ),
    reviewProviderId: v.optional(v.id("reviewProviders")),
    minBlockingSeverity: v.optional(
      v.union(
        v.literal("info"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
    ),
    requiresHumanApproval: v.boolean(),
    status: v.union(v.literal("active"), v.literal("disabled")),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_key", ["workspaceId", "key"]),

  reviewJobs: defineTable({
    workspaceId: v.id("workspaces"),
    reviewPolicyId: v.id("reviewPolicies"),
    reviewProviderId: v.id("reviewProviders"),
    provider: v.optional(v.literal("github")),
    deliveryId: v.optional(v.string()),
    eventType: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    repository: v.optional(v.string()),
    pullRequestNumber: v.optional(v.number()),
    pullRequestTitle: v.optional(v.string()),
    pullRequestUrl: v.optional(v.string()),
    headSha: v.optional(v.string()),
    baseSha: v.optional(v.string()),
    action: v.optional(
      v.union(
        v.literal("opened"),
        v.literal("reopened"),
        v.literal("synchronize"),
        v.literal("ready_for_review"),
      ),
    ),
    draft: v.optional(v.boolean()),
    author: v.optional(v.string()),
    sourceEventId: v.optional(v.id("sourceEvents")),
    requestedByReviewerIdentityId: v.optional(v.id("reviewerIdentities")),
    targetKind: v.union(
      v.literal("pull_request"),
      v.literal("commit"),
      v.literal("branch"),
      v.literal("patch"),
      v.literal("artifact"),
      v.literal("prompt"),
    ),
    targetRef: v.string(),
    title: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent"),
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("blocked"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("published"),
      v.literal("canceled"),
    ),
    execution: v.optional(
      v.object({
        startedAt: v.optional(v.string()),
        finishedAt: v.optional(v.string()),
        durationMs: v.optional(v.number()),
        error: v.optional(v.string()),
        retryCount: v.optional(v.number()),
      }),
    ),
    publication: v.optional(
      v.object({
        summaryCommentUrl: v.optional(v.string()),
        summaryCommentId: v.optional(v.number()),
        publishedAt: v.optional(v.string()),
        inlineCommentUrls: v.array(v.string()),
      }),
    ),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_review_policy", ["reviewPolicyId"])
    .index("by_review_provider", ["reviewProviderId"])
    .index("by_workspace_target", ["workspaceId", "targetKind", "targetRef"])
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_workspace_repo_pr", ["workspaceId", "repository", "pullRequestNumber"]),

  reviewRuns: defineTable({
    workspaceId: v.id("workspaces"),
    reviewJobId: v.id("reviewJobs"),
    reviewProviderId: v.id("reviewProviders"),
    reviewerIdentityId: v.id("reviewerIdentities"),
    attemptNumber: v.number(),
    runnerVersion: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("passed"),
      v.literal("failed"),
      v.literal("canceled"),
    ),
    startedAt: v.string(),
    finishedAt: v.optional(v.string()),
    summary: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_review_job", ["reviewJobId", "startedAt"])
    .index("by_review_provider", ["reviewProviderId"])
    .index("by_reviewer_identity", ["reviewerIdentityId"]),

  reviewFindings: defineTable({
    workspaceId: v.id("workspaces"),
    reviewJobId: v.id("reviewJobs"),
    reviewRunId: v.id("reviewRuns"),
    title: v.string(),
    detail: v.string(),
    severity: v.union(
      v.literal("info"),
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
    status: v.union(
      v.literal("open"),
      v.literal("acknowledged"),
      v.literal("resolved"),
      v.literal("dismissed"),
    ),
    filePath: v.optional(v.string()),
    lineStart: v.optional(v.number()),
    lineEnd: v.optional(v.number()),
    recommendation: v.optional(v.string()),
    fingerprint: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_review_run", ["reviewRunId", "severity"])
    .index("by_review_job", ["reviewJobId", "severity"])
    .index("by_review_status", ["status"]),

  reviewArtifacts: defineTable({
    workspaceId: v.id("workspaces"),
    reviewJobId: v.id("reviewJobs"),
    reviewRunId: v.id("reviewRuns"),
    kind: v.union(
      v.literal("diff"),
      v.literal("patch"),
      v.literal("prompt"),
      v.literal("log"),
      v.literal("trace"),
      v.literal("screenshot"),
      v.literal("attachment"),
    ),
    name: v.string(),
    storageKey: v.string(),
    mimeType: v.string(),
    contentHash: v.string(),
    sizeBytes: v.number(),
    createdAt: v.string(),
  })
    .index("by_review_run", ["reviewRunId", "kind"])
    .index("by_review_job", ["reviewJobId"]),

  reviewComments: defineTable({
    workspaceId: v.id("workspaces"),
    reviewJobId: v.id("reviewJobs"),
    reviewRunId: v.id("reviewRuns"),
    reviewFindingId: v.optional(v.id("reviewFindings")),
    replyToCommentId: v.optional(v.id("reviewComments")),
    authorReviewerIdentityId: v.optional(v.id("reviewerIdentities")),
    body: v.string(),
    visibility: v.union(v.literal("internal"), v.literal("public")),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_review_run", ["reviewRunId", "createdAt"])
    .index("by_review_job", ["reviewJobId", "createdAt"]),

  chunks: defineTable({
    workspaceId: v.id("workspaces"),
    documentKind: v.string(),
    documentId: v.string(),
    text: v.string(),
  }).index("by_document", ["documentKind", "documentId"]),

  chunkEmbeddings: defineTable({
    workspaceId: v.id("workspaces"),
    chunkId: v.id("chunks"),
    kind: v.string(),
    model: v.string(),
    vector: v.array(v.float64()),
  }).vectorIndex("by_vector", {
    vectorField: "vector",
    dimensions: EMBEDDING_DIMS,
    filterFields: ["workspaceId", "kind"],
  }),
});
