import { createHmac, timingSafeEqual } from "node:crypto";
import { PolicyViolationError } from "@lifeos/logging";
import {
  type GitHubPullRequestWebhookPayload,
  type GitHubWebhookHeaders,
  SUPPORTED_PULL_REQUEST_ACTIONS,
  type SupportedPullRequestAction,
} from "./types";

type ParsedGitHubWebhookRequest = {
  readonly headers: GitHubWebhookHeaders;
  readonly payload: GitHubPullRequestWebhookPayload;
  readonly rawBody: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new PolicyViolationError(`GitHub webhook payload is missing ${fieldName}.`, {
      field: fieldName,
      surface: "github-webhooks",
    });
  }

  return value;
}

function readNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PolicyViolationError(`GitHub webhook payload is missing ${fieldName}.`, {
      field: fieldName,
      surface: "github-webhooks",
    });
  }

  return value;
}

function readObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new PolicyViolationError(`GitHub webhook payload is missing ${fieldName}.`, {
      field: fieldName,
      surface: "github-webhooks",
    });
  }

  return value;
}

export function parseGitHubPullRequestWebhookPayload(
  payload: unknown,
): GitHubPullRequestWebhookPayload {
  const root = readObject(payload, "webhook payload");
  const pullRequest = readObject(root.pull_request, "pull_request");
  const head = readObject(pullRequest.head, "pull_request.head");
  const base = readObject(pullRequest.base, "pull_request.base");
  const headRepo = readObject(head.repo, "pull_request.head.repo");
  const baseRepo = readObject(base.repo, "pull_request.base.repo");
  const repository = readObject(root.repository, "repository");
  const sender = readObject(root.sender, "sender");

  return {
    action: readString(root.action, "action"),
    number: readNumber(root.number, "number"),
    repository: {
      full_name: readString(repository.full_name, "repository.full_name"),
    },
    pull_request: {
      number: readNumber(pullRequest.number, "pull_request.number"),
      title: readString(pullRequest.title, "pull_request.title"),
      body:
        pullRequest.body === null
          ? null
          : typeof pullRequest.body === "string"
            ? pullRequest.body
            : null,
      draft: Boolean(pullRequest.draft),
      html_url: readString(pullRequest.html_url, "pull_request.html_url"),
      head: {
        sha: readString(head.sha, "pull_request.head.sha"),
        ref: readString(head.ref, "pull_request.head.ref"),
        repo: {
          full_name: readString(headRepo.full_name, "pull_request.head.repo.full_name"),
        },
      },
      base: {
        sha: readString(base.sha, "pull_request.base.sha"),
        ref: readString(base.ref, "pull_request.base.ref"),
        repo: {
          full_name: readString(baseRepo.full_name, "pull_request.base.repo.full_name"),
        },
      },
      user: {
        login: readString(
          readObject(pullRequest.user, "pull_request.user").login,
          "pull_request.user.login",
        ),
      },
    },
    sender: {
      login: readString(sender.login, "sender.login"),
    },
  };
}

export function parseGitHubWebhookHeaders(headers: Headers): GitHubWebhookHeaders {
  const event = headers.get("x-github-event")?.trim();
  const deliveryId = headers.get("x-github-delivery")?.trim();
  const signature256 = headers.get("x-hub-signature-256")?.trim();

  if (!event) {
    throw new PolicyViolationError("Missing GitHub webhook event header.", {
      header: "x-github-event",
      surface: "github-webhooks",
    });
  }

  if (!deliveryId) {
    throw new PolicyViolationError("Missing GitHub delivery header.", {
      header: "x-github-delivery",
      surface: "github-webhooks",
    });
  }

  if (!signature256) {
    throw new PolicyViolationError("Missing GitHub signature header.", {
      header: "x-hub-signature-256",
      surface: "github-webhooks",
    });
  }

  return {
    event,
    deliveryId,
    signature256,
  };
}

export function verifyGitHubWebhookSignature(
  rawBody: string,
  signature256: string,
  webhookSecret: string,
) {
  if (!signature256.startsWith("sha256=")) {
    return false;
  }

  const provided = Buffer.from(signature256.slice("sha256=".length), "hex");
  const expected = createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest();

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

export function parseGitHubWebhookRequest(input: {
  readonly headers: Headers;
  readonly rawBody: string;
  readonly webhookSecret: string;
}): ParsedGitHubWebhookRequest {
  const headers = parseGitHubWebhookHeaders(input.headers);

  if (!verifyGitHubWebhookSignature(input.rawBody, headers.signature256, input.webhookSecret)) {
    throw new PolicyViolationError("GitHub webhook signature verification failed.", {
      header: "x-hub-signature-256",
      surface: "github-webhooks",
    });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(input.rawBody);
  } catch (error) {
    throw new PolicyViolationError("GitHub webhook body must be valid JSON.", {
      cause: error,
      surface: "github-webhooks",
    });
  }

  return {
    headers,
    payload: parseGitHubPullRequestWebhookPayload(payload),
    rawBody: input.rawBody,
  };
}

export function isSupportedPullRequestAction(action: string): action is SupportedPullRequestAction {
  return (SUPPORTED_PULL_REQUEST_ACTIONS as readonly string[]).includes(action);
}

export type GitHubPullRequestReviewEvent = {
  readonly provider: "github";
  readonly eventType: `github.pull_request.${SupportedPullRequestAction}`;
  readonly idempotencyKey: string;
  readonly deliveryId: string;
  readonly repository: string;
  readonly pullRequestNumber: number;
  readonly pullRequestTitle: string;
  readonly pullRequestUrl: string;
  readonly headSha: string;
  readonly baseSha: string;
  readonly action: SupportedPullRequestAction;
  readonly draft: boolean;
  readonly author: string;
  readonly receivedAt: string;
};

export function mapGitHubPullRequestWebhookEvent(input: {
  readonly payload: GitHubPullRequestWebhookPayload;
  readonly deliveryId: string;
  readonly receivedAt: string;
  readonly expectedRepository: string;
}): GitHubPullRequestReviewEvent | null {
  if (input.payload.repository.full_name !== input.expectedRepository) {
    throw new PolicyViolationError(
      "GitHub webhook repository does not match the configured repo.",
      {
        expectedRepository: input.expectedRepository,
        repository: input.payload.repository.full_name,
        surface: "github-webhooks",
      },
    );
  }

  if (!isSupportedPullRequestAction(input.payload.action)) {
    return null;
  }

  return {
    provider: "github",
    eventType: `github.pull_request.${input.payload.action}`,
    idempotencyKey: [
      input.deliveryId,
      input.payload.repository.full_name,
      input.payload.pull_request.number,
      input.payload.pull_request.head.sha,
      input.payload.action,
    ].join(":"),
    deliveryId: input.deliveryId,
    repository: input.payload.repository.full_name,
    pullRequestNumber: input.payload.pull_request.number,
    pullRequestTitle: input.payload.pull_request.title,
    pullRequestUrl: input.payload.pull_request.html_url,
    headSha: input.payload.pull_request.head.sha,
    baseSha: input.payload.pull_request.base.sha,
    action: input.payload.action,
    draft: input.payload.pull_request.draft,
    author: input.payload.pull_request.user.login,
    receivedAt: input.receivedAt,
  };
}
