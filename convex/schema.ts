import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const EMBEDDING_DIMS = 768 as const;

export default defineSchema({
  workspaces: defineTable({
    slug: v.string(),
    name: v.string(),
    createdBy: v.string()
  }).index("by_slug", ["slug"]),

  connections: defineTable({
    workspaceId: v.id("workspaces"),
    provider: v.string(),
    mode: v.union(v.literal("cloud"), v.literal("local")),
    dataClass: v.union(
      v.literal("public"),
      v.literal("private"),
      v.literal("restricted"),
      v.literal("derived")
    ),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("error")),
    externalAccountId: v.optional(v.string())
  }).index("by_workspace", ["workspaceId"]),

  sourceEvents: defineTable({
    workspaceId: v.id("workspaces"),
    connectionId: v.id("connections"),
    idempotencyKey: v.string(),
    eventType: v.string(),
    payloadHash: v.string(),
    payloadRef: v.optional(v.string()),
    receivedAt: v.string(),
    projectionState: v.union(
      v.literal("pending"),
      v.literal("applied"),
      v.literal("dead_letter")
    )
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
      v.literal("canceled")
    ),
    sourceEventId: v.optional(v.id("sourceEvents")),
    dueAt: v.optional(v.string()),
    updatedAt: v.string()
  }).index("by_workspace_status", ["workspaceId", "status"]),

  chunks: defineTable({
    workspaceId: v.id("workspaces"),
    documentKind: v.string(),
    documentId: v.string(),
    text: v.string()
  }).index("by_document", ["documentKind", "documentId"]),

  chunkEmbeddings: defineTable({
    workspaceId: v.id("workspaces"),
    chunkId: v.id("chunks"),
    kind: v.string(),
    model: v.string(),
    vector: v.array(v.float64())
  }).vectorIndex("by_vector", {
    vectorField: "vector",
    dimensions: EMBEDDING_DIMS,
    filterFields: ["workspaceId", "kind"],
    staged: true
  })
});

