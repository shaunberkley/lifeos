import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  mapGitHubPullRequestWebhookEvent,
  parseGitHubWebhookRequest,
  verifyGitHubWebhookSignature,
} from "./webhook";

function sign(rawBody: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
}

describe("GitHub webhook helpers", () => {
  it("verifies GitHub webhook signatures", () => {
    const rawBody = JSON.stringify({ hello: "world" });
    const secret = "test-secret";
    const signature = sign(rawBody, secret);

    expect(verifyGitHubWebhookSignature(rawBody, signature, secret)).toBe(true);
    expect(verifyGitHubWebhookSignature(rawBody, "sha256=deadbeef", secret)).toBe(false);
  });

  it("parses and maps supported pull request events", () => {
    const rawBody = JSON.stringify({
      action: "opened",
      number: 42,
      repository: {
        full_name: "shaunberkley/lifeos",
      },
      pull_request: {
        number: 42,
        title: "Add LifeOS Reviewer MVP",
        body: "Initial integration",
        draft: false,
        html_url: "https://github.com/shaunberkley/lifeos/pull/42",
        head: {
          sha: "abc123",
          ref: "feat/lifeos-reviewer-mvp",
          repo: {
            full_name: "shaunberkley/lifeos",
          },
        },
        base: {
          sha: "def456",
          ref: "main",
          repo: {
            full_name: "shaunberkley/lifeos",
          },
        },
        user: {
          login: "shaunberkley",
        },
      },
      sender: {
        login: "shaunberkley",
      },
    });

    const request = parseGitHubWebhookRequest({
      headers: new Headers({
        "x-github-event": "pull_request",
        "x-github-delivery": "delivery-123",
        "x-hub-signature-256": sign(rawBody, "test-secret"),
      }),
      rawBody,
      webhookSecret: "test-secret",
    });

    expect(request.payload.pull_request.title).toBe("Add LifeOS Reviewer MVP");

    const mapped = mapGitHubPullRequestWebhookEvent({
      payload: request.payload,
      deliveryId: "delivery-123",
      receivedAt: "2026-03-24T20:00:00.000Z",
      expectedRepository: "shaunberkley/lifeos",
    });

    expect(mapped).toMatchObject({
      provider: "github",
      eventType: "github.pull_request.opened",
      repository: "shaunberkley/lifeos",
      pullRequestNumber: 42,
      headSha: "abc123",
      baseSha: "def456",
      author: "shaunberkley",
    });
  });

  it("rejects unsupported pull request actions at mapping time", () => {
    const rawBody = JSON.stringify({
      action: "closed",
      number: 42,
      repository: {
        full_name: "shaunberkley/lifeos",
      },
      pull_request: {
        number: 42,
        title: "Add LifeOS Reviewer MVP",
        body: null,
        draft: false,
        html_url: "https://github.com/shaunberkley/lifeos/pull/42",
        head: {
          sha: "abc123",
          ref: "feat/lifeos-reviewer-mvp",
          repo: {
            full_name: "shaunberkley/lifeos",
          },
        },
        base: {
          sha: "def456",
          ref: "main",
          repo: {
            full_name: "shaunberkley/lifeos",
          },
        },
        user: {
          login: "shaunberkley",
        },
      },
      sender: {
        login: "shaunberkley",
      },
    });

    const request = parseGitHubWebhookRequest({
      headers: new Headers({
        "x-github-event": "pull_request",
        "x-github-delivery": "delivery-456",
        "x-hub-signature-256": sign(rawBody, "test-secret"),
      }),
      rawBody,
      webhookSecret: "test-secret",
    });

    expect(
      mapGitHubPullRequestWebhookEvent({
        payload: request.payload,
        deliveryId: "delivery-456",
        receivedAt: "2026-03-24T20:00:00.000Z",
        expectedRepository: "shaunberkley/lifeos",
      }),
    ).toBeNull();
  });
});
