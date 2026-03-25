import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChangedFileSummary, PullRequestContext, PullRequestRef } from "./types";

const execFileAsync = promisify(execFile);

type GhClient = {
  readPullRequest(repo: string, prNumber: number): Promise<PullRequestContext>;
  readDiff(repo: string, prNumber: number): Promise<string>;
};

function parsePullRequest(payload: string): PullRequestContext {
  const parsed = JSON.parse(payload) as {
    baseRefName?: string;
    body?: string;
    commits?: { oid: string }[];
    files?: { additions?: number; deletions?: number; path: string; patch?: string }[];
    headRefOid?: string;
    headRefName?: string;
    number: number;
    title?: string;
    url?: string;
  };

  const changedFiles: ChangedFileSummary[] = (parsed.files ?? []).map((file) => {
    const summary: ChangedFileSummary = {
      path: file.path,
      additions: file.additions ?? 0,
      deletions: file.deletions ?? 0,
    };

    if (file.patch !== undefined) {
      summary.patch = file.patch;
    }

    return summary;
  });

  const pullRequest: PullRequestRef = {
    number: parsed.number,
    repo: "",
  };

  if (parsed.baseRefName !== undefined) {
    pullRequest.baseRefName = parsed.baseRefName;
  }

  if (parsed.headRefName !== undefined) {
    pullRequest.headRefName = parsed.headRefName;
  }

  if (parsed.headRefOid !== undefined) {
    pullRequest.headSha = parsed.headRefOid;
  }

  if (parsed.title !== undefined) {
    pullRequest.title = parsed.title;
  }

  if (parsed.url !== undefined) {
    pullRequest.url = parsed.url;
  }

  const context: PullRequestContext = {
    pullRequest,
    changedFiles,
    commits: (parsed.commits ?? []).map((commit) => commit.oid),
  };

  if (parsed.body !== undefined) {
    context.body = parsed.body;
  }

  return context;
}

export function createGhClient(): GhClient {
  return {
    async readPullRequest(repo, prNumber) {
      const { stdout } = await execFileAsync(
        "gh",
        [
          "pr",
          "view",
          String(prNumber),
          "--repo",
          repo,
          "--json",
          "number,title,url,body,baseRefName,headRefName,headRefOid,commits,files",
        ],
        { maxBuffer: 16 * 1024 * 1024 },
      );
      const context = parsePullRequest(stdout);
      return {
        ...context,
        pullRequest: {
          ...context.pullRequest,
          repo,
        },
      };
    },

    async readDiff(repo, prNumber) {
      const { stdout } = await execFileAsync(
        "gh",
        ["pr", "diff", String(prNumber), "--repo", repo, "--patch"],
        { maxBuffer: 32 * 1024 * 1024 },
      );
      return stdout;
    },
  };
}

export type { GhClient };
