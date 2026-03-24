import { describe, expect, it } from "vitest";
import { runtimeSummary } from "./runtime";

type TableName = "connections" | "sourceEvents" | "workspaces";

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

const runtimeSummaryHandler = runtimeSummary as typeof runtimeSummary & {
  _handler: (ctx: ReturnType<typeof createQueryCtx>, args: {}) => Promise<{
    connectionCount: number;
    sourceEventCount: number;
    workspaceCount: number;
  }>;
};

describe("Convex runtimeSummary", () => {
  it("reads actual backend state through the registered Convex query wrapper", async () => {
    const ctx = createQueryCtx({
      connections: [],
      sourceEvents: [],
      workspaces: [],
    });

    const before = await runtimeSummaryHandler._handler(ctx, {});
    expect(before).toEqual({
      connectionCount: 0,
      sourceEventCount: 0,
      workspaceCount: 0,
    });

    const populatedCtx = createQueryCtx({
      connections: [
        {
          _id: "connections:1",
          _creationTime: 0,
        },
      ],
      sourceEvents: [
        {
          _id: "sourceEvents:1",
          _creationTime: 0,
        },
      ],
      workspaces: [
        {
          _id: "workspaces:1",
          _creationTime: 0,
        },
      ],
    });

    const after = await runtimeSummaryHandler._handler(populatedCtx, {});
    expect(after).toEqual({
      connectionCount: 1,
      sourceEventCount: 1,
      workspaceCount: 1,
    });
  });
});
