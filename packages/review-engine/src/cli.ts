#!/usr/bin/env node
import { cwd, exit } from "node:process";
import { createCodexRunner } from "./codex";
import { buildSpecialists, defaultPromptTemplate, defaultRubricDefinition } from "./defaults";
import { createGhClient } from "./gh";
import { loadPromptTemplate, loadRubricDefinition } from "./loaders";
import { runReviewEngine } from "./orchestrator";
import type { PromptSource } from "./types";

type CliOptions = {
  prNumber: number;
  deep: boolean;
  repo?: string;
  repositoryRoot: string;
  promptSource: PromptSource;
  rubricSource: PromptSource;
};

const defaultPromptSource: PromptSource = {
  kind: "inline",
  value: JSON.stringify(defaultPromptTemplate),
};

const defaultRubricSource: PromptSource = {
  kind: "inline",
  value: JSON.stringify(defaultRubricDefinition),
};

function parseArgs(argv: readonly string[]): CliOptions {
  let prNumber: number | undefined;
  let deep = false;
  let repo: string | undefined;
  let repositoryRoot = cwd();
  let promptSource = defaultPromptSource;
  let rubricSource = defaultRubricSource;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--pr") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--pr requires a pull request number.");
      }
      prNumber = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    if (argument === "--deep") {
      deep = true;
      continue;
    }

    if (argument === "--repo") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--repo requires a repository identifier.");
      }
      repo = next;
      index += 1;
      continue;
    }

    if (argument === "--root") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--root requires a repository root path.");
      }
      repositoryRoot = next;
      index += 1;
      continue;
    }

    if (argument === "--prompt-file") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--prompt-file requires a path.");
      }
      promptSource = { kind: "file", value: next };
      index += 1;
      continue;
    }

    if (argument === "--rubric-file") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--rubric-file requires a path.");
      }
      rubricSource = { kind: "file", value: next };
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!prNumber || Number.isNaN(prNumber) || prNumber <= 0) {
    throw new Error("A positive --pr value is required.");
  }

  const options: CliOptions = {
    prNumber,
    deep,
    repositoryRoot,
    promptSource,
    rubricSource,
  };

  if (repo !== undefined) {
    options.repo = repo;
  }

  return options;
}

export async function runCli(argv: readonly string[]): Promise<void> {
  const options = parseArgs(argv);
  const prompt = await loadPromptTemplate(options.promptSource, options.repositoryRoot);
  const rubric = await loadRubricDefinition(options.rubricSource, options.repositoryRoot);
  const gh = createGhClient();
  const repository = options.repo ?? (await gh.resolveRepository(options.repositoryRoot));
  const pullRequest = await gh.readPullRequest(repository, options.prNumber);
  const rawDiff = await gh.readDiff(repository, options.prNumber);
  const reviewResult = await runReviewEngine(
    {
      repositoryRoot: options.repositoryRoot,
      pullRequest,
      rawDiff,
      reviewDepth: options.deep ? "deep" : "standard",
      rubric,
      specialists: buildSpecialists(options.deep ? "deep" : "standard", prompt),
    },
    {
      runner: createCodexRunner(),
    },
  );

  process.stdout.write(`${JSON.stringify(reviewResult, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2)).catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown CLI error.";
    process.stderr.write(`${message}\n`);
    exit(1);
  });
}

export { buildSpecialists, parseArgs };
