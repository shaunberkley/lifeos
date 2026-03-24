import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReviewOrchestrator } from "../github/orchestrator";
import { getReviewJob, resetReviewStateForTests } from "../github/store";
import { reviewsRoute } from "./reviews";

function setGitHubPublishEnvironment() {
  process.env.GITHUB_REPOSITORY = "shaunberkley/lifeos";
  process.env.GITHUB_TOKEN = "github-token";
}

function createQueuedReview() {
  const orchestrator = createReviewOrchestrator(() => "2026-03-24T20:00:00.000Z");

  return orchestrator.enqueueGitHubPullRequestReview({
    provider: "github",
    eventType: "github.pull_request.opened",
    idempotencyKey: "delivery-17:shaunberkley/lifeos:17:abc123:opened",
    deliveryId: "delivery-17",
    repository: "shaunberkley/lifeos",
    pullRequestNumber: 17,
    pullRequestTitle: "LifeOS Reviewer MVP",
    pullRequestUrl: "https://github.com/shaunberkley/lifeos/pull/17",
    headSha: "abc123",
    baseSha: "def456",
    action: "opened",
    draft: false,
    author: "shaunberkley",
    receivedAt: "2026-03-24T20:00:00.000Z",
  });
}

describe("review routes", () => {
  beforeEach(() => {
    resetReviewStateForTests();
  });

  afterEach(() => {
    resetReviewStateForTests();
    process.env.GITHUB_REPOSITORY = undefined;
    process.env.GITHUB_TOKEN = undefined;
    vi.restoreAllMocks();
  });

  it("lists and retrieves queued reviews", async () => {
    const review = createQueuedReview();

    const listResponse = await reviewsRoute.request("http://lifeos.test/", {
      method: "GET",
    });
    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject({
      ok: true,
      reviews: [expect.objectContaining({ id: review.id, status: "queued" })],
    });

    const detailResponse = await reviewsRoute.request(`http://lifeos.test/${review.id}`, {
      method: "GET",
    });
    expect(detailResponse.status).toBe(200);
    await expect(detailResponse.json()).resolves.toMatchObject({
      ok: true,
      review: expect.objectContaining({
        id: review.id,
        pullRequestNumber: 17,
      }),
    });
  });

  it("publishes inline and summary review comments", async () => {
    setGitHubPublishEnvironment();
    const review = createQueuedReview();

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((async (input) => {
      const url = String(input);

      if (url.includes("/pulls/17/comments")) {
        return new Response(JSON.stringify({ html_url: `${url}/inline` }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.includes("/issues/17/comments")) {
        return new Response(JSON.stringify({ html_url: `${url}/summary` }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ html_url: `${url}/fallback` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch);

    const response = await reviewsRoute.request(`http://lifeos.test/${review.id}/publish`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        summaryComment: {
          body: "Summary comment body",
        },
        inlineComments: [
          {
            path: "apps/server/src/app.ts",
            line: 12,
            side: "RIGHT",
            body: "Please split the route mount.",
          },
        ],
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      publication: {
        summaryCommentUrl:
          "https://api.github.com/repos/shaunberkley/lifeos/issues/17/comments/summary",
        inlineCommentUrls: [
          "https://api.github.com/repos/shaunberkley/lifeos/pulls/17/comments/inline",
        ],
      },
      review: expect.objectContaining({
        id: review.id,
        status: "published",
      }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getReviewJob(review.id)).toMatchObject({
      status: "published",
      publication: {
        summaryCommentUrl:
          "https://api.github.com/repos/shaunberkley/lifeos/issues/17/comments/summary",
        inlineCommentUrls: [
          "https://api.github.com/repos/shaunberkley/lifeos/pulls/17/comments/inline",
        ],
      },
    });
  });

  it("returns execution metadata when present on a review", async () => {
    const review = createQueuedReview();

    const detailResponse = await reviewsRoute.request(`http://lifeos.test/${review.id}`, {
      method: "GET",
    });

    expect(detailResponse.status).toBe(200);
    const payload = await detailResponse.json();
    expect(payload).toMatchObject({
      ok: true,
      review: expect.objectContaining({
        id: review.id,
        status: "queued",
      }),
    });
    expect(payload.review).not.toHaveProperty("execution");
  });
});
