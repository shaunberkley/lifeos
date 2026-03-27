import { ServiceUnavailableError } from "@lifeos/logging";
import type {
  GitHubInlineCommentDraft,
  GitHubPublishInlineCommentInput,
  GitHubPublishResult,
  GitHubPublishReviewRequest,
  GitHubPublishSummaryCommentInput,
  GitHubRepositoryRef,
  GitHubReviewJob,
} from "./types";

export type GitHubPublishServiceConfig = {
  readonly token: string;
  readonly repository: GitHubRepositoryRef;
  readonly apiUrl: string;
  readonly fetch?: typeof fetch;
};

function buildHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function buildBaseRepositoryUrl(config: GitHubPublishServiceConfig) {
  return `${config.apiUrl.replace(/\/$/, "")}/repos/${config.repository.owner}/${config.repository.name}`;
}

function buildSummaryCommentRequest(
  config: GitHubPublishServiceConfig,
  input: GitHubPublishSummaryCommentInput,
) {
  return {
    url: `${buildBaseRepositoryUrl(config)}/issues/${input.pullRequestNumber}/comments`,
    init: {
      method: "POST",
      headers: buildHeaders(config.token),
      body: JSON.stringify({ body: input.body }),
    },
  };
}

function buildInlineCommentRequest(
  config: GitHubPublishServiceConfig,
  input: GitHubPublishInlineCommentInput,
) {
  return {
    url: `${buildBaseRepositoryUrl(config)}/pulls/${input.pullRequestNumber}/comments`,
    init: {
      method: "POST",
      headers: buildHeaders(config.token),
      body: JSON.stringify({
        body: input.body,
        commit_id: input.commitSha,
        path: input.path,
        line: input.line,
        side: input.side,
      }),
    },
  };
}

async function postJson(
  fetchImpl: typeof fetch,
  request:
    | ReturnType<typeof buildSummaryCommentRequest>
    | ReturnType<typeof buildInlineCommentRequest>,
) {
  const response = await fetchImpl(request.url, request.init);

  if (!response.ok) {
    throw new ServiceUnavailableError("GitHub API request failed.", {
      status: response.status,
      surface: "github-publisher",
      url: request.url,
    });
  }

  return (await response.json()) as { html_url?: string };
}

function requireBody(input: { readonly body: string }) {
  const body = input.body.trim();
  if (!body) {
    throw new ServiceUnavailableError("GitHub comment body cannot be empty.", {
      surface: "github-publisher",
    });
  }

  return body;
}

export function createGitHubPublishService(config: GitHubPublishServiceConfig) {
  const fetchImpl = config.fetch ?? fetch;

  return {
    async publishSummaryComment(input: GitHubPublishSummaryCommentInput) {
      const request = buildSummaryCommentRequest(config, {
        ...input,
        body: requireBody(input),
      });
      const payload = await postJson(fetchImpl, request);
      return payload.html_url ?? `${request.url}/summary`;
    },
    async publishInlineComment(input: GitHubPublishInlineCommentInput) {
      const request = buildInlineCommentRequest(config, {
        ...input,
        body: requireBody(input),
      });
      const payload = await postJson(fetchImpl, request);
      return payload.html_url ?? `${request.url}/inline`;
    },
    async publishReview(
      job: GitHubReviewJob,
      request: GitHubPublishReviewRequest,
    ): Promise<GitHubPublishResult> {
      const inlineCommentUrls: string[] = [];

      for (const comment of request.inlineComments) {
        inlineCommentUrls.push(
          await createGitHubPublishService(config).publishInlineComment({
            repository: config.repository,
            pullRequestNumber: job.pullRequestNumber,
            commitSha: job.headSha,
            path: comment.path,
            line: comment.line,
            side: comment.side,
            body: comment.body,
          }),
        );
      }

      const summaryCommentUrl = await createGitHubPublishService(config).publishSummaryComment({
        repository: config.repository,
        pullRequestNumber: job.pullRequestNumber,
        body: request.summaryComment.body,
      });

      return {
        summaryCommentUrl,
        inlineCommentUrls,
      };
    },
  };
}

export function buildReviewSummaryBody(job: GitHubReviewJob) {
  return [
    "## LifeOS Reviewer review queued",
    "",
    `- Repository: \`${job.repository}\``,
    `- Pull request: #${job.pullRequestNumber}`,
    `- Action: \`${job.action}\``,
    `- Draft: \`${job.draft ? "yes" : "no"}\``,
    `- Head SHA: \`${job.headSha}\``,
    `- Author: @${job.author}`,
  ].join("\n");
}

export function buildInlineReviewComment(
  file: string,
  line: number,
  body: string,
  side: "LEFT" | "RIGHT" = "RIGHT",
): GitHubInlineCommentDraft {
  return {
    path: file,
    line,
    body,
    side,
  };
}
