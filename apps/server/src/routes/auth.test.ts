import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { AUTH_JWKS_PATH } from "../auth/config";
import { resetAuthRuntimeForTests } from "../auth/runtime";

describe("auth route", () => {
  async function withAuthEnvironment() {
    process.env.AUTH_ISSUER = "http://lifeos.test";
    process.env.CONVEX_APPLICATION_ID = "lifeos-dev";
    process.env.BETTER_AUTH_SECRET = "test-secret-for-lifeos-auth-route";
    process.env.WEB_ORIGIN = "http://localhost:1337";
    process.env.AUTH_DATABASE_PATH = path.join(
      os.tmpdir(),
      `lifeos-auth-${crypto.randomUUID()}.sqlite`,
    );
    await resetAuthRuntimeForTests();
    return process.env.AUTH_DATABASE_PATH;
  }

  it("serves a JWKS document for Convex custom JWT verification", async () => {
    const databasePath = await withAuthEnvironment();

    const response = await createApp().request(AUTH_JWKS_PATH, {
      method: "GET",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      keys: expect.arrayContaining([
        expect.objectContaining({
          alg: "ES256",
          kid: expect.any(String),
          kty: "EC",
        }),
      ]),
    });

    await resetAuthRuntimeForTests();
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
  });

  it("echoes the correlation id when mounted in the application", async () => {
    const databasePath = await withAuthEnvironment();

    const response = await createApp().request(AUTH_JWKS_PATH, {
      method: "GET",
      headers: {
        "x-correlation-id": "req-auth-mounted",
      },
    });

    expect(response.headers.get("x-correlation-id")).toBe("req-auth-mounted");
    await expect(response.json()).resolves.toMatchObject({
      keys: expect.any(Array),
    });

    await resetAuthRuntimeForTests();
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
  });
});
