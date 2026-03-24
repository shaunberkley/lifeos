import { describe, expectTypeOf, it } from "vitest";
import type { ConnectionId, DataClass, SourceEventId, WorkspaceId } from "./index";

describe("@lifeos/domain type invariants", () => {
  it("keeps branded identifiers nominally distinct", () => {
    expectTypeOf<WorkspaceId>().not.toEqualTypeOf<ConnectionId>();
    expectTypeOf<WorkspaceId>().not.toEqualTypeOf<SourceEventId>();
    expectTypeOf<ConnectionId>().not.toEqualTypeOf<SourceEventId>();
  });

  it("keeps the data-class vocabulary stable", () => {
    expectTypeOf<DataClass>().toEqualTypeOf<"public" | "private" | "restricted" | "derived">();
  });
});
