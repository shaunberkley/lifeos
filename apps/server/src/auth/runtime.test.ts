import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { type JSONWebKeySet, createLocalJWKSet, jwtVerify } from "jose";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import { AUTH_JWKS_PATH } from "./config";
import { getAuthRuntime, resetAuthRuntimeForTests } from "./runtime";

const ENV_KEYS = [
  "AUTH_ISSUER",
  "CONVEX_APPLICATION_ID",
  "BETTER_AUTH_SECRET",
  "WEB_ORIGIN",
  "AUTH_DATABASE_PATH",
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as Record<
  (typeof ENV_KEYS)[number],
  string | undefined
>;

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = originalEnv[key];
  }
}

function setValidAuthEnvironment() {
  process.env.AUTH_ISSUER = "http://lifeos.test";
  process.env.CONVEX_APPLICATION_ID = "lifeos-dev";
  process.env.BETTER_AUTH_SECRET = "lifeos-better-auth-test-secret-v1";
  process.env.WEB_ORIGIN = "http://localhost:1337";
  process.env.AUTH_DATABASE_PATH = path.join(
    os.tmpdir(),
    `lifeos-auth-${crypto.randomUUID()}.sqlite`,
  );
}

describe("auth runtime", () => {
  afterEach(async () => {
    const databasePath = process.env.AUTH_DATABASE_PATH;
    await resetAuthRuntimeForTests();
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
    restoreEnv();
  });

  it("caches the initialized runtime until reset", async () => {
    setValidAuthEnvironment();

    const first = await getAuthRuntime();
    const second = await getAuthRuntime();

    expect(second).toBe(first);
    expect(first.auth.options.emailAndPassword).toBeUndefined();
    await resetAuthRuntimeForTests();

    const third = await getAuthRuntime();
    expect(third).not.toBe(first);
  });

  it("retries after an initialization failure", async () => {
    process.env.AUTH_ISSUER = " ";
    process.env.CONVEX_APPLICATION_ID = "lifeos-dev";
    process.env.BETTER_AUTH_SECRET = "lifeos-better-auth-test-secret-v1";
    process.env.WEB_ORIGIN = "http://localhost:1337";
    process.env.AUTH_DATABASE_PATH = path.join(
      os.tmpdir(),
      `lifeos-auth-${crypto.randomUUID()}.sqlite`,
    );

    await expect(getAuthRuntime()).rejects.toThrow(
      "Missing required auth environment variable: AUTH_ISSUER",
    );

    process.env.AUTH_ISSUER = "http://lifeos.test";

    const runtime = await getAuthRuntime();
    expect(runtime.auth.options.emailAndPassword).toBeUndefined();
  });

  it("treats reset as a no-op before initialization", async () => {
    await expect(resetAuthRuntimeForTests()).resolves.toBeUndefined();
  });

  it("verifies Better Auth JWTs against the served JWKS using the Convex issuer and audience", async () => {
    setValidAuthEnvironment();

    const runtime = await getAuthRuntime();
    const jwt = await runtime.auth.api.signJWT({
      body: {
        payload: {
          sub: "lifeos-user-1",
        },
      },
    });

    const response = await createApp().request(AUTH_JWKS_PATH, {
      method: "GET",
    });

    expect(response.status).toBe(200);

    const jwks = (await response.json()) as JSONWebKeySet;
    const issuer = process.env.AUTH_ISSUER;
    const audience = process.env.CONVEX_APPLICATION_ID;

    if (!issuer || !audience) {
      throw new Error("Auth test environment was not initialized correctly.");
    }

    const { payload } = await jwtVerify(jwt.token, createLocalJWKSet(jwks), { issuer, audience });

    expect(payload).toMatchObject({
      aud: "lifeos-dev",
      iss: "http://lifeos.test",
      sub: "lifeos-user-1",
    });
  });
});
