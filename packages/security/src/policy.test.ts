import { describe, expect, it } from "vitest";
import { assertBoundaryAllowed, canSendDataToBoundary, canUseRemoteModel } from "./index";

describe("@lifeos/security policy helpers", () => {
  it("allows public and derived data while failing closed for restricted data", () => {
    expect(canSendDataToBoundary("public", "remote")).toBe(true);
    expect(canSendDataToBoundary("derived", "remote")).toBe(true);
    expect(canSendDataToBoundary("private", "local")).toBe(true);
    expect(canSendDataToBoundary("restricted", "local")).toBe(true);
    expect(canUseRemoteModel("private")).toBe(false);
    expect(canUseRemoteModel("restricted")).toBe(false);
    expect(canUseRemoteModel("public")).toBe(true);
    expect(() => assertBoundaryAllowed("private", "remote")).toThrow(
      /Refusing to send private data to the remote boundary/,
    );
    expect(() => assertBoundaryAllowed("restricted", "remote")).toThrow(
      /Refusing to send restricted data to the remote boundary/,
    );
  });
});
