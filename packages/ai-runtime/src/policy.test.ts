import { describe, expect, it } from "vitest";
import {
  ModelPolicyError,
  ReviewProviderResolutionError,
  assertModelAllowed,
  getMissingCapabilities,
  resolveReviewProvider,
} from "./index";
import { createClaudePlaceholderAdapter } from "./providers/claude";
import { createCodexReviewAdapter } from "./providers/codex";

describe("@lifeos/ai-runtime policy", () => {
  it("rejects remote models for restricted data", () => {
    expect(() => assertModelAllowed("restricted", "remote")).toThrow(ModelPolicyError);
  });

  it("reports missing provider capabilities", () => {
    const missingCapabilities = getMissingCapabilities(
      createClaudePlaceholderAdapter().descriptor,
      ["json-events", "code-review"],
    );

    expect(missingCapabilities).toEqual(["json-events"]);
  });

  it("prefers the Codex adapter for restricted review requests", () => {
    const selection = resolveReviewProvider(
      [createClaudePlaceholderAdapter(), createCodexReviewAdapter()],
      {
        dataClass: "restricted",
        requiredCapabilities: ["code-review", "json-events"],
      },
    );

    expect(selection.descriptor.id).toBe("codex-cli");
    expect(selection.modelClass).toBe("local");
  });

  it("fails resolution when only a placeholder provider matches", () => {
    expect(() =>
      resolveReviewProvider([createClaudePlaceholderAdapter()], {
        dataClass: "public",
        requiredCapabilities: ["code-review"],
      }),
    ).toThrow(ReviewProviderResolutionError);
  });
});
