import { createHmac } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { AUTH_JWKS_PATH } from "./auth/config";
import { getAuthRuntime, resetAuthRuntimeForTests } from "./auth/runtime";
import { resetReviewStateForTests } from "./github/store";

async function withControlPlaneEnvironment() {
  process.env.AUTH_ISSUER = "http://lifeos.test";
  process.env.CONVEX_APPLICATION_ID = "lifeos-dev";
  process.env.BETTER_AUTH_SECRET = "test-secret-for-lifeos-app";
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

describe("@lifeos/server app", () => {
  it("mounts auth JWKS, keeps webhooks fail closed, and keeps health available", async () => {
    await resetReviewStateForTests();
    const databasePath = await withControlPlaneEnvironment();
    const controlPlaneToken = await createControlPlaneToken();

    const app = createApp();

    const authResponse = await app.request(AUTH_JWKS_PATH, { method: "GET" });
    expect(authResponse.status).toBe(200);
    expect(authResponse.headers.get("x-correlation-id")).toBeTruthy();
    await expect(authResponse.json()).resolves.toMatchObject({
      keys: expect.any(Array),
    });

    const webhookResponse = await app.request("/webhooks", { method: "POST" });
    expect(webhookResponse.status).toBe(501);
    expect(webhookResponse.headers.get("x-correlation-id")).toBeTruthy();
    await expect(webhookResponse.json()).resolves.toMatchObject({
      ok: false,
      error: "not_implemented",
      correlationId: expect.any(String),
    });

    const healthResponse = await app.request("/health");
    expect(healthResponse.status).toBe(200);
    await expect(healthResponse.json()).resolves.toMatchObject({
      ok: true,
      service: "lifeos-server",
      correlationId: expect.any(String),
    });

    const providersDeniedResponse = await app.request("/providers");
    expect(providersDeniedResponse.status).toBe(401);
    await expect(providersDeniedResponse.json()).resolves.toMatchObject({
      ok: false,
      error: "unauthorized",
    });

    const providersResponse = await app.request("/providers", {
      headers: {
        authorization: `Bearer ${controlPlaneToken}`,
      },
    });
    expect(providersResponse.status).toBe(200);
    await expect(providersResponse.json()).resolves.toMatchObject({
      ok: true,
      providers: expect.arrayContaining([
        expect.objectContaining({
          provider: "github",
          displayName: "GitHub",
        }),
        expect.objectContaining({
          provider: "reviewer",
          id: "codex-cli",
        }),
      ]),
    });

    const reviewsDeniedResponse = await app.request("/reviews");
    expect(reviewsDeniedResponse.status).toBe(401);
    await expect(reviewsDeniedResponse.json()).resolves.toMatchObject({
      ok: false,
      error: "unauthorized",
    });

    const reviewsResponse = await app.request("/reviews", {
      headers: {
        authorization: `Bearer ${controlPlaneToken}`,
      },
    });
    expect(reviewsResponse.status).toBe(200);
    await expect(reviewsResponse.json()).resolves.toMatchObject({
      ok: true,
      reviews: [],
    });

    const reviewRunDeniedResponse = await app.request("/reviews/missing-review/run", {
      method: "POST",
    });
    expect(reviewRunDeniedResponse.status).toBe(401);
    await expect(reviewRunDeniedResponse.json()).resolves.toMatchObject({
      ok: false,
      error: "unauthorized",
    });

    const reviewPublishDeniedResponse = await app.request("/reviews/missing-review/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        summaryComment: {
          body: "Denied summary comment body",
        },
      }),
    });
    expect(reviewPublishDeniedResponse.status).toBe(401);
    await expect(reviewPublishDeniedResponse.json()).resolves.toMatchObject({
      ok: false,
      error: "unauthorized",
    });

    process.env.GITHUB_WEBHOOK_SECRET = "app-test-webhook-secret";
    process.env.GITHUB_REPOSITORY = "shaunberkley/lifeos";

    const rawBody = JSON.stringify({
      action: "closed",
      number: 17,
      repository: {
        full_name: "shaunberkley/lifeos",
      },
      pull_request: {
        number: 17,
        title: "LifeOS Reviewer MVP",
        body: null,
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

    const signature = `sha256=${createHmac("sha256", "app-test-webhook-secret")
      .update(rawBody, "utf8")
      .digest("hex")}`;

    const githubWebhookResponse = await app.request("/webhooks/github", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-delivery": "app-test-delivery",
        "x-github-event": "pull_request",
        "x-hub-signature-256": signature,
      },
      body: rawBody,
    });

    expect(githubWebhookResponse.status).toBe(202);
    await expect(githubWebhookResponse.json()).resolves.toMatchObject({
      ok: true,
      accepted: false,
      reason: "unsupported_action",
      action: "closed",
    });

    await resetAuthRuntimeForTests();
    await resetReviewStateForTests();
    process.env.GITHUB_WEBHOOK_SECRET = undefined;
    process.env.GITHUB_REPOSITORY = undefined;
    process.env.AUTH_ISSUER = undefined;
    process.env.CONVEX_APPLICATION_ID = undefined;
    process.env.BETTER_AUTH_SECRET = undefined;
    process.env.WEB_ORIGIN = undefined;
    process.env.AUTH_DATABASE_PATH = undefined;
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
  });
});
