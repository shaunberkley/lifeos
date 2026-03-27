import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthRuntime, resetAuthRuntimeForTests } from "../auth/runtime";
import { createReviewOrchestrator } from "../github/orchestrator";
import { getReviewJob, resetReviewStateForTests } from "../github/store";
import { reviewsRoute } from "./reviews";

async function withControlPlaneEnvironment() {
  process.env.AUTH_ISSUER = "http://lifeos.test";
  process.env.CONVEX_APPLICATION_ID = "lifeos-dev";
  process.env.BETTER_AUTH_SECRET = "test-secret-for-lifeos-reviews";
  process.env.WEB_ORIGIN = "http://localhost:1337";
  process.env.AUTH_DATABASE_PATH = path.join(
    os.tmpdir(),
    `lifeos-auth-${crypto.randomUUID()}.sqlite`,
  );
  await resetAuthRuntimeForTests();
  return process.env.AUTH_DATABASE_PATH;
}

async function createControlPlaneToken() {
  const { auth } = await getAuthRuntime();
  const jwt = await auth.api.signJWT({
    body: {
      payload: {
        sub: "lifeos-control-plane",
      },
    },
  });

  return jwt.token;
}

function setGitHubPublishEnvironment() {
  process.env.GITHUB_REPOSITORY = "shaunberkley/lifeos";
  process.env.GITHUB_TOKEN = "github-token";
}

async function createQueuedReview() {
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
  beforeEach(async () => {
    await resetReviewStateForTests();
  });

  afterEach(async () => {
    await resetReviewStateForTests();
    process.env.GITHUB_REPOSITORY = undefined;
    process.env.GITHUB_TOKEN = undefined;
    const databasePath = process.env.AUTH_DATABASE_PATH;
    await resetAuthRuntimeForTests();
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
    process.env.AUTH_ISSUER = undefined;
    process.env.CONVEX_APPLICATION_ID = undefined;
    process.env.BETTER_AUTH_SECRET = undefined;
    process.env.WEB_ORIGIN = undefined;
    process.env.AUTH_DATABASE_PATH = undefined;
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated review control-plane requests", async () => {
    const response = await reviewsRoute.request("http://lifeos.test/", {
      method: "GET",
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "unauthorized",
    });
  });

  it("lists and retrieves queued reviews for authenticated callers", async () => {
    const databasePath = await withControlPlaneEnvironment();
    const controlPlaneToken = await createControlPlaneToken();
    const review = await createQueuedReview();

    const listResponse = await reviewsRoute.request("http://lifeos.test/", {
      method: "GET",
      headers: {
        authorization: `Bearer ${controlPlaneToken}`,
      },
    });
    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject({
      ok: true,
      reviews: [expect.objectContaining({ id: review.id, status: "queued" })],
    });

    const detailResponse = await reviewsRoute.request(`http://lifeos.test/${review.id}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${controlPlaneToken}`,
      },
    });
    expect(detailResponse.status).toBe(200);
    await expect(detailResponse.json()).resolves.toMatchObject({
      ok: true,
      review: expect.objectContaining({
        id: review.id,
        pullRequestNumber: 17,
      }),
    });

    await resetAuthRuntimeForTests();
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
  });

  it("publishes inline and summary review comments", async () => {
    const databasePath = await withControlPlaneEnvironment();
    const controlPlaneToken = await createControlPlaneToken();
    setGitHubPublishEnvironment();
    const review = await createQueuedReview();

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
        authorization: `Bearer ${controlPlaneToken}`,
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
    const finalJob = await getReviewJob(review.id);
    expect(finalJob).toMatchObject({
      status: "published",
      publication: {
        summaryCommentUrl:
          "https://api.github.com/repos/shaunberkley/lifeos/issues/17/comments/summary",
        inlineCommentUrls: [
          "https://api.github.com/repos/shaunberkley/lifeos/pulls/17/comments/inline",
        ],
      },
    });

    await resetAuthRuntimeForTests();
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
  });

  it("returns execution metadata when present on a review", async () => {
    const databasePath = await withControlPlaneEnvironment();
    const controlPlaneToken = await createControlPlaneToken();
    const review = await createQueuedReview();

    const detailResponse = await reviewsRoute.request(`http://lifeos.test/${review.id}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${controlPlaneToken}`,
      },
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

    await resetAuthRuntimeForTests();
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
  });

  it("returns not_found when executing an unknown review job", async () => {
    const databasePath = await withControlPlaneEnvironment();
    const controlPlaneToken = await createControlPlaneToken();

    const response = await reviewsRoute.request("http://lifeos.test/missing-review/run", {
      method: "POST",
      headers: {
        authorization: `Bearer ${controlPlaneToken}`,
      },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "not_found",
      message: "Review job not found.",
    });

    await resetAuthRuntimeForTests();
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
  });
});
