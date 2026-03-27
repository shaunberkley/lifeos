import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getAuthRuntime, resetAuthRuntimeForTests } from "../auth/runtime";
import { providersRoute } from "./providers";

async function withControlPlaneEnvironment() {
  process.env.AUTH_ISSUER = "http://lifeos.test";
  process.env.CONVEX_APPLICATION_ID = "lifeos-dev";
  process.env.BETTER_AUTH_SECRET = "test-secret-for-lifeos-providers";
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

describe("provider routes", () => {
  afterEach(async () => {
    process.env.GITHUB_WEBHOOK_SECRET = undefined;
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
  });

  it("rejects unauthenticated provider control-plane requests", async () => {
    const response = await providersRoute.request("http://lifeos.test/", {
      method: "GET",
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "unauthorized",
    });
  });

  it("returns the GitHub provider catalog for authenticated callers", async () => {
    const databasePath = await withControlPlaneEnvironment();
    const controlPlaneToken = await createControlPlaneToken();

    const response = await providersRoute.request("http://lifeos.test/", {
      method: "GET",
      headers: {
        authorization: `Bearer ${controlPlaneToken}`,
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      providers: [
        expect.objectContaining({
          provider: "github",
          capabilities: [
            "pull_request_webhooks",
            "queued_review_jobs",
            "inline_review_comments",
            "summary_review_comments",
          ],
        }),
        expect.objectContaining({
          provider: "reviewer",
          id: "codex-cli",
          family: "codex",
          status: "ready",
        }),
        expect.objectContaining({
          provider: "reviewer",
          id: "claude-code",
          family: "claude",
          status: "placeholder",
        }),
      ],
    });
  });

  it("returns a GitHub provider detail record with configuration flags", async () => {
    const databasePath = await withControlPlaneEnvironment();
    const controlPlaneToken = await createControlPlaneToken();
    process.env.GITHUB_WEBHOOK_SECRET = "github-webhook-secret";
    process.env.GITHUB_REPOSITORY = "shaunberkley/lifeos";
    process.env.GITHUB_TOKEN = "github-token";

    const response = await providersRoute.request("http://lifeos.test/github", {
      method: "GET",
      headers: {
        authorization: `Bearer ${controlPlaneToken}`,
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      provider: {
        provider: "github",
        repository: "shaunberkley/lifeos",
        webhookConfigured: true,
        publishConfigured: true,
      },
    });

    await resetAuthRuntimeForTests();
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
  });
});
