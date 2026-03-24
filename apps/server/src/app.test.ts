import { createHmac } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { AUTH_JWKS_PATH } from "./auth/config";
import { resetAuthRuntimeForTests } from "./auth/runtime";
import { resetReviewStateForTests } from "./github/store";

describe("@lifeos/server app", () => {
  it("mounts auth JWKS, keeps webhooks fail closed, and keeps health available", async () => {
    resetReviewStateForTests();
    process.env.AUTH_ISSUER = "http://lifeos.test";
    process.env.CONVEX_APPLICATION_ID = "lifeos-dev";
    process.env.BETTER_AUTH_SECRET = "test-secret-for-lifeos-app";
    process.env.WEB_ORIGIN = "http://localhost:1337";
    process.env.AUTH_DATABASE_PATH = path.join(
      os.tmpdir(),
      `lifeos-auth-${crypto.randomUUID()}.sqlite`,
    );
    await resetAuthRuntimeForTests();

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

    const providersResponse = await app.request("/providers");
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

    const reviewsResponse = await app.request("/reviews");
    expect(reviewsResponse.status).toBe(200);
    await expect(reviewsResponse.json()).resolves.toMatchObject({
      ok: true,
      reviews: [],
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

    const databasePath = process.env.AUTH_DATABASE_PATH;
    await resetAuthRuntimeForTests();
    resetReviewStateForTests();
    process.env.GITHUB_WEBHOOK_SECRET = undefined;
    process.env.GITHUB_REPOSITORY = undefined;
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
  });
});
