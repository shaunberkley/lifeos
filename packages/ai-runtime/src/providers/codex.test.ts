import { describe, expect, it } from "vitest";
import { createCodexReviewAdapter } from "./codex";

describe("Codex review adapter", () => {
  it("builds a remote codex review invocation from the real CLI contract", () => {
    const invocation = createCodexReviewAdapter().buildInvocation({
      cwd: "/tmp/lifeos",
      dataClass: "public",
      model: "gpt-5-codex",
      outputLastMessagePath: "/tmp/lifeos/review.txt",
      prompt: "Review this diff for correctness and risk.",
      target: {
        baseBranch: "origin/main",
        kind: "base",
      },
      title: "Risk review",
    });

    expect(invocation).toEqual({
      args: [
        "-C",
        "/tmp/lifeos",
        "exec",
        "review",
        "--ephemeral",
        "--json",
        "-m",
        "gpt-5-codex",
        "--base",
        "origin/main",
        "--title",
        "Risk review",
        "-o",
        "/tmp/lifeos/review.txt",
        "-",
      ],
      cwd: "/tmp/lifeos",
      env: {},
      executable: "codex",
      kind: "cli",
      modelClass: "remote",
      providerId: "codex-cli",
      stdin: "Review this diff for correctness and risk.",
      timeoutMs: 300000,
    });
  });

  it("switches to the local OSS path for restricted data", () => {
    const invocation = createCodexReviewAdapter().buildInvocation({
      cwd: "/tmp/lifeos",
      dataClass: "restricted",
      localProvider: "ollama",
      prompt: "Review only the local changes.",
      target: {
        kind: "uncommitted",
      },
    });

    expect(invocation.args).toEqual([
      "-C",
      "/tmp/lifeos",
      "exec",
      "review",
      "--ephemeral",
      "--json",
      "--oss",
      "--local-provider",
      "ollama",
      "--uncommitted",
      "-",
    ]);
    expect(invocation.modelClass).toBe("local");
  });
});
