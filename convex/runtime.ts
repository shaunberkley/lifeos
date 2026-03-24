import { queryGeneric } from "convex/server";
import { v } from "convex/values";

export const runtimeSummary = queryGeneric({
  args: {},
  returns: v.object({
    connectionCount: v.number(),
    sourceEventCount: v.number(),
    workspaceCount: v.number(),
  }),
  handler: async (ctx) => {
    const [workspaces, connections, sourceEvents] = await Promise.all([
      ctx.db.query("workspaces").collect(),
      ctx.db.query("connections").collect(),
      ctx.db.query("sourceEvents").collect(),
    ]);

    return {
      connectionCount: connections.length,
      sourceEventCount: sourceEvents.length,
      workspaceCount: workspaces.length,
    };
  },
});
