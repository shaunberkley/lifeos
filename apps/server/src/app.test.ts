import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { AUTH_JWKS_PATH } from "./auth/config";
import { resetAuthRuntimeForTests } from "./auth/runtime";

describe("@lifeos/server app", () => {
  it("mounts auth JWKS, keeps webhooks fail closed, and keeps health available", async () => {
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

    const databasePath = process.env.AUTH_DATABASE_PATH;
    await resetAuthRuntimeForTests();
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
  });
});
