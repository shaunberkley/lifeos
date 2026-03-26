import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChangedFileSummary, PullRequestContext, PullRequestRef } from "./types";

const execFileAsync = promisify(execFile);

type CommandRunner = (
  command: string,
  args: readonly string[],
  options?: { cwd?: string; maxBuffer?: number },
) => Promise<{ stdout: string }>;

type GhClient = {
  resolveRepository(repositoryRoot: string): Promise<string>;
  readPullRequest(repo: string, prNumber: number): Promise<PullRequestContext>;
  readDiff(repo: string, prNumber: number): Promise<string>;
};

function createCommandRunner(): CommandRunner {
  return async (command, args, options) => {
    const result = await execFileAsync(command, [...args], {
      cwd: options?.cwd,
      maxBuffer: options?.maxBuffer,
    });

    return { stdout: result.stdout };
  };
}

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

export function parseGitHubRepoFromRemote(remote: string): string | undefined {
  const normalized = remote.trim();
  const match =
    /^(?:git@github\.com:|https:\/\/github\.com\/|ssh:\/\/git@github\.com\/)([^/]+)\/([^/]+?)(?:\.git)?$/.exec(
      normalized,
    );

  if (!match) {
    return undefined;
  }

  return `${match[1]}/${match[2]}`;
}

export async function resolveRepositoryFromContext(
  repositoryRoot: string,
  runner: CommandRunner = createCommandRunner(),
): Promise<string> {
  for (const remoteName of ["origin", "upstream"] as const) {
    try {
      const { stdout } = await runner("git", ["remote", "get-url", remoteName], {
        cwd: repositoryRoot,
        maxBuffer: 1024 * 1024,
      });
      const repository = parseGitHubRepoFromRemote(stdout);

      if (repository) {
        return repository;
      }
    } catch {
      // Try the next source.
    }
  }

  try {
    const { stdout } = await runner("gh", ["repo", "view", "--json", "owner,name"], {
      cwd: repositoryRoot,
      maxBuffer: 1024 * 1024,
    });
    const parsed = JSON.parse(stdout) as {
      name?: string;
      owner?: { login?: string };
    };

    if (parsed.owner?.login && parsed.name) {
      return `${parsed.owner.login}/${parsed.name}`;
    }
  } catch {
    // Surface the explicit error below.
  }

  throw new Error("Unable to determine the GitHub repository. Pass --repo owner/name.");
}

export function createGhClient(runner: CommandRunner = createCommandRunner()): GhClient {
  return {
    resolveRepository(repositoryRoot) {
      return resolveRepositoryFromContext(repositoryRoot, runner);
    },

    async readPullRequest(repo, prNumber) {
      const { stdout } = await runner(
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
      const { stdout } = await runner(
        "gh",
        ["pr", "diff", String(prNumber), "--repo", repo, "--patch"],
        { maxBuffer: 32 * 1024 * 1024 },
      );
      return stdout;
    },
  };
}

export type { CommandRunner, GhClient };
