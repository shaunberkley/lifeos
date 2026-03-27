import { describe, expect, it } from "vitest";
import { buildSpecialists, parseArgs } from "./cli";

describe("review-engine cli", () => {
  it("parses required arguments without injecting a repo default", () => {
    expect(parseArgs(["--pr", "95", "--deep", "--root", "/repo"])).toEqual({
      prNumber: 95,
      deep: true,
      repo: undefined,
      repositoryRoot: "/repo",
      promptSource: expect.any(Object),
      rubricSource: expect.any(Object),
    });
  });

  it("preserves an explicit repo override", () => {
    expect(parseArgs(["--pr", "95", "--repo", "owner/repo"])).toMatchObject({
      prNumber: 95,
      repo: "owner/repo",
    });
  });

  it("builds additional specialist passes for deep mode", () => {
    const prompt = {
      id: "lifeos-reviewer",
      version: "1",
      system: "system",
      user: "user",
    };

    expect(buildSpecialists("standard", prompt).map((entry) => entry.id)).toEqual([
      "testing-contracts",
      "runtime-semantics",
    ]);
    expect(buildSpecialists("deep", prompt).map((entry) => entry.id)).toEqual([
      "testing-contracts",
      "runtime-semantics",
      "determinism",
      "security",
    ]);
  });

  it("rejects missing pull request numbers", () => {
    expect(() => parseArgs(["--deep"])).toThrow("A positive --pr value is required.");
  });
});
