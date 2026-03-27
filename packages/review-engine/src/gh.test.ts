import { describe, expect, it } from "vitest";
import { type CommandRunner, parseGitHubRepoFromRemote, resolveRepositoryFromContext } from "./gh";

describe("review-engine gh helpers", () => {
  it("parses GitHub repository names from common remote formats", () => {
    expect(parseGitHubRepoFromRemote("git@github.com:shaunberkley/lifeos.git")).toBe(
      "shaunberkley/lifeos",
    );
    expect(parseGitHubRepoFromRemote("https://github.com/shaunberkley/lifeos")).toBe(
      "shaunberkley/lifeos",
    );
    expect(parseGitHubRepoFromRemote("ssh://git@github.com/shaunberkley/lifeos.git")).toBe(
      "shaunberkley/lifeos",
    );
    expect(parseGitHubRepoFromRemote("git@gitlab.com:shaunberkley/lifeos.git")).toBeUndefined();
  });

  it("resolves the repository from git remotes before falling back to gh", async () => {
    const calls: string[] = [];
    const runner: CommandRunner = async (command, args) => {
      calls.push(`${command} ${args.join(" ")}`);

      if (command === "git") {
        return { stdout: "git@github.com:shaunberkley/lifeos.git\n" };
      }

      throw new Error("gh should not be called");
    };

    await expect(resolveRepositoryFromContext("/repo", runner)).resolves.toBe(
      "shaunberkley/lifeos",
    );
    expect(calls).toEqual(["git remote get-url origin"]);
  });

  it("falls back to gh repo view when git remotes are unavailable", async () => {
    const runner: CommandRunner = async (command) => {
      if (command === "git") {
        throw new Error("missing remote");
      }

      return {
        stdout: JSON.stringify({
          owner: { login: "shaunberkley" },
          name: "lifeos",
        }),
      };
    };

    await expect(resolveRepositoryFromContext("/repo", runner)).resolves.toBe(
      "shaunberkley/lifeos",
    );
  });

  it("fails with an explicit error when no repository can be derived", async () => {
    const runner: CommandRunner = async () => {
      throw new Error("no context");
    };

    await expect(resolveRepositoryFromContext("/repo", runner)).rejects.toThrow(
      "Unable to determine the GitHub repository. Pass --repo owner/name.",
    );
  });
});
