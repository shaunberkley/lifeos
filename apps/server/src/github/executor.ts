import { AppError, ServiceUnavailableError } from "@lifeos/logging";
import {
  type CodexRunner,
  type GhClient,
  type ReviewEngineResult,
  buildSpecialists,
  createCodexRunner,
  createGhClient,
  defaultPromptTemplate,
  defaultRubricDefinition,
  runReviewEngine,
} from "@lifeos/review-engine";
import { getGitHubPublishEnvironment } from "./config";
import { type GitHubPublishServiceConfig, createGitHubPublishService } from "./publisher";
import { getReviewJob, updateReviewJob } from "./store";
import type {
  GitHubInlineCommentDraft,
  GitHubPublishResult,
  GitHubPublishReviewRequest,
  GitHubReviewJob,
} from "./types";

type ReviewExecutionDependencies = {
  readonly ghClient?: GhClient;
  readonly runner?: CodexRunner;
  readonly publishService?: {
    publishReview(
      job: GitHubReviewJob,
      request: GitHubPublishReviewRequest,
    ): Promise<GitHubPublishResult>;
  };
  readonly publishEnvironment?: GitHubPublishServiceConfig;
};

function toSummaryMarkdown(job: GitHubReviewJob, result: ReviewEngineResult): string {
  const lines = [
    "## LifeOS Reviewer review",
    "",
    `- Pull request: #${job.pullRequestNumber}`,
    `- Outcome: ${result.synthesis.summary.outcome}`,
    `- Overall risk: ${result.synthesis.summary.overallRisk}`,
    `- Findings: ${result.synthesis.findings.length}`,
    "",
    result.synthesis.summary.headline,
    "",
    result.synthesis.summary.rationale,
  ];

  if (result.synthesis.findings.length > 0) {
    lines.push("", "### Findings");
    for (const finding of result.synthesis.findings) {
      lines.push(
        `- [${finding.severity}] ${finding.title}: ${finding.rationale}${
          finding.suggestedFix ? ` Fix: ${finding.suggestedFix}` : ""
        }`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function toInlineComments(result: ReviewEngineResult): readonly GitHubInlineCommentDraft[] {
  return result.synthesis.findings.flatMap((finding) => {
    if (!finding.filePath || !finding.line) {
      return [];
    }

    return [
      {
        path: finding.filePath,
        line: finding.line,
        side: "RIGHT" as const,
        body: `${finding.title}\n\n${finding.rationale}\n\nFix: ${finding.suggestedFix}`,
      },
    ];
  });
}

function toPublishRequest(
  job: GitHubReviewJob,
  result: ReviewEngineResult,
): GitHubPublishReviewRequest {
  return {
    summaryComment: {
      body: toSummaryMarkdown(job, result),
    },
    inlineComments: toInlineComments(result),
  };
}

export async function executeReviewJob(
  reviewId: string,
  repositoryRoot = process.cwd(),
  dependencies: ReviewExecutionDependencies = {},
) {
  const job = getReviewJob(reviewId);
  if (!job) {
    throw new AppError({
      code: "not_found",
      message: "Review job not found.",
      status: 404,
      details: {
        reviewId,
        surface: "github-review-executor",
      },
    });
  }

  const startedAt = new Date().toISOString();
  updateReviewJob(reviewId, (current) => ({
    ...current,
    status: "running",
    updatedAt: startedAt,
    execution: {
      startedAt,
    },
  }));

  try {
    const gh = dependencies.ghClient ?? createGhClient();
    const pullRequest = await gh.readPullRequest(job.repository, job.pullRequestNumber);
    const rawDiff = await gh.readDiff(job.repository, job.pullRequestNumber);
    const result = await runReviewEngine(
      {
        repositoryRoot,
        pullRequest,
        rawDiff,
        reviewDepth: "deep",
        rubric: defaultRubricDefinition,
        specialists: buildSpecialists("deep", defaultPromptTemplate),
      },
      {
        runner: dependencies.runner ?? createCodexRunner(),
      },
    );

    const summaryMarkdown = toSummaryMarkdown(job, result);
    const publishRequest = toPublishRequest(job, result);
    const publisher =
      dependencies.publishService ??
      createGitHubPublishService(dependencies.publishEnvironment ?? getGitHubPublishEnvironment());
    const publication = await publisher.publishReview(
      {
        ...job,
        headSha: pullRequest.pullRequest.headSha ?? job.headSha,
      },
      publishRequest,
    );
    const finishedAt = new Date().toISOString();

    updateReviewJob(reviewId, (current) => ({
      ...current,
      status: "published",
      updatedAt: finishedAt,
      execution: {
        startedAt,
        finishedAt,
        findingsCount: result.synthesis.findings.length,
        specialistCount: result.specialistPasses.length,
        outcome: result.synthesis.summary.outcome,
        overallRisk: result.synthesis.summary.overallRisk,
        summary: result.synthesis.summary.headline,
        summaryMarkdown,
        artifactManifest: result.artifacts.artifactManifest,
        artifacts: {
          diffManifest: result.artifacts.diffManifest,
          contextManifest: result.artifacts.contextManifest,
        },
        findings: result.synthesis.findings,
      },
      publication: {
        ...current.publication,
        ...publication,
        publishedAt: finishedAt,
      },
    }));

    return result;
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : "Unknown review execution error.";

    updateReviewJob(reviewId, (current) => ({
      ...current,
      status: "failed",
      updatedAt: finishedAt,
      execution: {
        ...current.execution,
        startedAt,
        finishedAt,
        error: message,
      },
    }));

    throw error;
  }
}
