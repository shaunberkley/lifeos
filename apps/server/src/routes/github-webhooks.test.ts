import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getReviewJob, listReviewJobs, resetReviewStateForTests } from "../github/store";
import { githubWebhooksRoute } from "./github-webhooks";

function sign(rawBody: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
}

function setGitHubWebhookEnvironment() {
  process.env.GITHUB_WEBHOOK_SECRET = "github-webhook-secret";
  process.env.GITHUB_REPOSITORY = "shaunberkley/lifeos";
}

function buildPullRequestPayload(action: string) {
  return JSON.stringify({
    action,
    number: 17,
    repository: {
      full_name: "shaunberkley/lifeos",
    },
    pull_request: {
      number: 17,
      title: "LifeOS Reviewer MVP",
      body: "Dogfood review",
      draft: false,
      html_url: "https://github.com/shaunberkley/lifeos/pull/17",
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
}

describe("github webhook route", () => {
  beforeEach(() => {
    resetReviewStateForTests();
    setGitHubWebhookEnvironment();
  });

  afterEach(() => {
    resetReviewStateForTests();
    process.env.GITHUB_WEBHOOK_SECRET = undefined;
    process.env.GITHUB_REPOSITORY = undefined;
  });

  it("queues a review job for supported pull request events", async () => {
    const rawBody = buildPullRequestPayload("opened");

    const response = await githubWebhooksRoute.request("http://lifeos.test/github", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-delivery": "delivery-17",
        "x-github-event": "pull_request",
        "x-hub-signature-256": sign(rawBody, "github-webhook-secret"),
      },
      body: rawBody,
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      accepted: true,
      eventType: "github.pull_request.opened",
      pullRequestNumber: 17,
      reviewId: expect.any(String),
    });

    const jobs = listReviewJobs();
    expect(jobs).toHaveLength(1);
    expect(getReviewJob(jobs[0]?.id ?? "")).toMatchObject({
      repository: "shaunberkley/lifeos",
      pullRequestNumber: 17,
      eventType: "github.pull_request.opened",
      status: "queued",
    });
  });

  it("rejects invalid webhook signatures", async () => {
    const rawBody = buildPullRequestPayload("opened");

    const response = await githubWebhooksRoute.request("http://lifeos.test/github", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-delivery": "delivery-18",
        "x-github-event": "pull_request",
        "x-hub-signature-256": "sha256=deadbeef",
      },
      body: rawBody,
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "policy_violation",
      message: "GitHub webhook signature verification failed.",
    });
    expect(listReviewJobs()).toHaveLength(0);
  });

  it("ignores unsupported pull request actions without queuing work", async () => {
    const rawBody = buildPullRequestPayload("closed");

    const response = await githubWebhooksRoute.request("http://lifeos.test/github", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-delivery": "delivery-19",
        "x-github-event": "pull_request",
        "x-hub-signature-256": sign(rawBody, "github-webhook-secret"),
      },
      body: rawBody,
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      accepted: false,
      reason: "unsupported_action",
      action: "closed",
    });
    expect(listReviewJobs()).toHaveLength(0);
  });
});
