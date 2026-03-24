import { createArtifactEntry, createArtifactManifest, serializeArtifactJson } from "./artifacts";
import { type CodexRunner, summarizePasses } from "./codex";
import type {
  ContextManifest,
  DiffManifest,
  PullRequestContext,
  ReviewDepth,
  ReviewEngineResult,
  ReviewSeverity,
  RubricDefinition,
  SpecialistKind,
  SpecialistPassDefinition,
} from "./types";

type ReviewEngineInput = {
  repositoryRoot: string;
  pullRequest: PullRequestContext;
  rawDiff: string;
  reviewDepth: ReviewDepth;
  rubric: RubricDefinition;
  specialists: readonly SpecialistPassDefinition[];
};

type ReviewEngineDependencies = {
  runner: CodexRunner;
  now?: () => string;
};

function createDiffManifest(input: ReviewEngineInput, createdAt: string): DiffManifest {
  return {
    createdAt,
    repositoryRoot: input.repositoryRoot,
    pullRequest: input.pullRequest.pullRequest,
    files: input.pullRequest.changedFiles,
    commitShas: input.pullRequest.commits,
    rawDiff: input.rawDiff,
  };
}

function createContextManifest(
  input: ReviewEngineInput,
  specialists: readonly SpecialistKind[],
  createdAt: string,
): ContextManifest {
  const firstPrompt = input.specialists[0]?.prompt;

  if (!firstPrompt) {
    throw new Error("At least one specialist pass definition is required.");
  }

  return {
    createdAt,
    repositoryRoot: input.repositoryRoot,
    reviewDepth: input.reviewDepth,
    specialists,
    rubric: {
      name: input.rubric.name,
      version: input.rubric.version,
    },
    prompt: {
      id: firstPrompt.id,
      version: firstPrompt.version,
    },
  };
}

export function determineOverallRisk(
  findings: readonly { severity: ReviewSeverity }[],
): ReviewSeverity {
  return (
    findings.find((finding) => finding.severity === "critical")?.severity ??
    findings.find((finding) => finding.severity === "high")?.severity ??
    findings.find((finding) => finding.severity === "medium")?.severity ??
    findings.find((finding) => finding.severity === "low")?.severity ??
    "info"
  );
}

export async function runReviewEngine(
  input: ReviewEngineInput,
  dependencies: ReviewEngineDependencies,
): Promise<ReviewEngineResult> {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const createdAt = now();
  const diffManifest = createDiffManifest(input, createdAt);
  const contextManifest = createContextManifest(
    input,
    input.specialists.map((specialist) => specialist.kind),
    createdAt,
  );

  const specialistPasses = [];

  for (const specialist of input.specialists) {
    specialistPasses.push(
      await dependencies.runner.runSpecialist({
        definition: specialist,
        diffManifest,
        contextManifest,
        rubric: input.rubric,
      }),
    );
  }

  const synthesis = summarizePasses(specialistPasses);
  synthesis.summary.overallRisk = determineOverallRisk(synthesis.findings);

  const artifactManifest = createArtifactManifest(
    [
      createArtifactEntry(
        "artifacts/diff-manifest.json",
        serializeArtifactJson(diffManifest),
        "json",
      ),
      createArtifactEntry(
        "artifacts/context-manifest.json",
        serializeArtifactJson(contextManifest),
        "json",
      ),
      createArtifactEntry("artifacts/synthesis.json", serializeArtifactJson(synthesis), "json"),
      ...specialistPasses.map((pass) =>
        createArtifactEntry(
          `artifacts/specialists/${pass.passId}.json`,
          serializeArtifactJson(pass),
          "json",
        ),
      ),
    ],
    createdAt,
  );

  return {
    artifacts: {
      diffManifest,
      contextManifest,
      artifactManifest,
    },
    specialistPasses,
    synthesis,
  };
}

export type { ReviewEngineDependencies, ReviewEngineInput };
