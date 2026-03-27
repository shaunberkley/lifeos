import { describe, expect, expectTypeOf, it } from "vitest";
import {
  type ReviewArtifactKind,
  type ReviewCommentVisibility,
  type ReviewFindingSeverity,
  type ReviewJobId,
  type ReviewJobStatus,
  type ReviewPolicyMode,
  type ReviewProviderId,
  type ReviewProviderKind,
  type ReviewRunId,
  type ReviewRunStatus,
  type ReviewTargetKind,
  type ReviewerIdentityId,
  isTerminalReviewJobStatus,
  isTerminalReviewRunStatus,
} from "./index";

describe("@lifeos/domain review invariants", () => {
  it("keeps review identifiers nominally distinct", () => {
    expectTypeOf<ReviewProviderId>().not.toEqualTypeOf<ReviewerIdentityId>();
    expectTypeOf<ReviewProviderId>().not.toEqualTypeOf<ReviewJobId>();
    expectTypeOf<ReviewRunId>().not.toEqualTypeOf<ReviewJobId>();
  });

  it("keeps the review vocabularies stable", () => {
    expectTypeOf<ReviewProviderKind>().toEqualTypeOf<
      "codex" | "claude" | "cursor" | "github" | "manual"
    >();
    expectTypeOf<ReviewTargetKind>().toEqualTypeOf<
      "pull_request" | "commit" | "branch" | "patch" | "artifact" | "prompt"
    >();
    expectTypeOf<ReviewJobStatus>().toEqualTypeOf<
      "queued" | "running" | "blocked" | "completed" | "failed" | "canceled"
    >();
    expectTypeOf<ReviewRunStatus>().toEqualTypeOf<
      "queued" | "running" | "passed" | "failed" | "canceled"
    >();
    expectTypeOf<ReviewFindingSeverity>().toEqualTypeOf<
      "info" | "low" | "medium" | "high" | "critical"
    >();
    expectTypeOf<ReviewPolicyMode>().toEqualTypeOf<"advisory" | "required">();
    expectTypeOf<ReviewArtifactKind>().toEqualTypeOf<
      "diff" | "patch" | "prompt" | "log" | "trace" | "screenshot" | "attachment"
    >();
    expectTypeOf<ReviewCommentVisibility>().toEqualTypeOf<"internal" | "public">();
  });

  it("recognizes terminal review statuses", () => {
    expect(isTerminalReviewJobStatus("completed")).toBe(true);
    expect(isTerminalReviewJobStatus("blocked")).toBe(false);
    expect(isTerminalReviewRunStatus("passed")).toBe(true);
    expect(isTerminalReviewRunStatus("running")).toBe(false);
  });
});
