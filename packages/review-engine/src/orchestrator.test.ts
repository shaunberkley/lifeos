import { describe, expect, it } from "vitest";
import type { CodexRunner } from "./codex";
import { runReviewEngine } from "./orchestrator";
import type { PullRequestContext, SpecialistPassDefinition } from "./types";

describe("review-engine orchestrator", () => {
  it("runs specialist passes in order and produces deterministic artifacts", async () => {
    const calls: string[] = [];
    const runner: CodexRunner = {
      async runSpecialist(input) {
        calls.push(input.definition.id);
        return {
          passId: input.definition.id,
          kind: input.definition.kind,
          model: "codex-test",
          durationMs: 5,
          findings:
            input.definition.id === "runtime"
              ? [
                  {
                    severity: "high",
                    title: "Runtime failure",
                    rationale: "failure rationale",
                    suggestedFix: "fix runtime",
                    fileReferences: ["apps/server/src/auth/runtime.ts"],
                  },
                ]
              : [],
          rawOutput: "{}",
        };
      },
    };

    const pullRequest: PullRequestContext = {
      pullRequest: {
        number: 95,
        repo: "shaunberkley/lifeos",
        title: "feat: auth scaffold",
      },
      changedFiles: [{ path: "apps/server/src/auth/runtime.ts", additions: 10, deletions: 1 }],
      commits: ["abc123"],
      body: "body",
    };
    const specialists: readonly SpecialistPassDefinition[] = [
      {
        id: "contracts",
        kind: "testing-contracts",
        title: "contracts",
        prompt: { id: "lifeos-reviewer", version: "1", system: "system", user: "user" },
      },
      {
        id: "runtime",
        kind: "runtime-semantics",
        title: "runtime",
        prompt: { id: "lifeos-reviewer", version: "1", system: "system", user: "user" },
      },
    ];

    const result = await runReviewEngine(
      {
        repositoryRoot: "/repo",
        pullRequest,
        rawDiff: "diff --git",
        reviewDepth: "deep",
        rubric: {
          version: "1",
          name: "lifeos-reviewer",
          criteria: [
            {
              id: "contracts",
              title: "Contracts",
              description: "desc",
              weight: 3,
            },
          ],
        },
        specialists,
      },
      {
        runner,
        now: () => "2026-03-24T12:00:00.000Z",
      },
    );

    expect(calls).toEqual(["contracts", "runtime"]);
    expect(result.synthesis.summary.outcome).toBe("request_changes");
    expect(result.synthesis.summary.overallRisk).toBe("high");
    expect(result.artifacts.contextManifest.specialists).toEqual([
      "testing-contracts",
      "runtime-semantics",
    ]);
    expect(result.artifacts.artifactManifest.entries.map((entry) => entry.path)).toEqual([
      "artifacts/context-manifest.json",
      "artifacts/diff-manifest.json",
      "artifacts/specialists/contracts.json",
      "artifacts/specialists/runtime.json",
      "artifacts/synthesis.json",
    ]);
  });
});
