import { ConfigurationError } from "@lifeos/logging";
import type { GitHubProviderStatus, GitHubRepositoryRef } from "./types";

export type GitHubWebhookEnvironment = {
  readonly webhookSecret: string;
  readonly repository: GitHubRepositoryRef;
  readonly apiUrl: string;
};

export type GitHubPublishEnvironment = {
  readonly token: string;
  readonly repository: GitHubRepositoryRef;
  readonly apiUrl: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ConfigurationError(`Missing required GitHub environment variable: ${name}`, {
      name,
      surface: "github",
    });
  }

  return value;
}

function getOptionalEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function parseRepositorySlug(value: string): GitHubRepositoryRef {
  const [owner, ...rest] = value.split("/");
  const name = rest.join("/");

  if (!owner || !name) {
    throw new ConfigurationError("GITHUB_REPOSITORY must be in owner/repo form.", {
      name: "GITHUB_REPOSITORY",
      surface: "github",
    });
  }

  return {
    fullName: `${owner}/${name}`,
    owner,
    name,
  };
}

export function getGitHubWebhookEnvironment(): GitHubWebhookEnvironment {
  return {
    webhookSecret: requireEnv("GITHUB_WEBHOOK_SECRET"),
    repository: parseRepositorySlug(requireEnv("GITHUB_REPOSITORY")),
    apiUrl: getOptionalEnv("GITHUB_API_URL", "https://api.github.com"),
  };
}

export function getGitHubPublishEnvironment(): GitHubPublishEnvironment {
  return {
    token: requireEnv("GITHUB_TOKEN"),
    repository: parseRepositorySlug(requireEnv("GITHUB_REPOSITORY")),
    apiUrl: getOptionalEnv("GITHUB_API_URL", "https://api.github.com"),
  };
}

export function getGitHubProviderStatus(): GitHubProviderStatus {
  const repository = process.env.GITHUB_REPOSITORY?.trim();
  const webhookConfigured = Boolean(process.env.GITHUB_WEBHOOK_SECRET?.trim() && repository);
  const publishConfigured = Boolean(process.env.GITHUB_TOKEN?.trim() && repository);

  return {
    provider: "github",
    displayName: "GitHub",
    ...(repository ? { repository } : {}),
    webhookConfigured,
    publishConfigured,
    webhookEndpoint: "/webhooks/github",
    reviewRoutes: {
      list: "/reviews",
      detailPattern: "/reviews/:reviewId",
      publishPattern: "/reviews/:reviewId/publish",
      executePattern: "/reviews/:reviewId/run",
    },
    capabilities: [
      "pull_request_webhooks",
      "queued_review_jobs",
      "inline_review_comments",
      "summary_review_comments",
    ],
    requiredEnvironment: ["GITHUB_WEBHOOK_SECRET", "GITHUB_REPOSITORY", "GITHUB_TOKEN"],
  };
}
