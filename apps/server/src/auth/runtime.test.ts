import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
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
    await resetAuthRuntimeForTests();

    const third = await getAuthRuntime();
    expect(third).not.toBe(first);
  });

  it("treats reset as a no-op before initialization", async () => {
    await expect(resetAuthRuntimeForTests()).resolves.toBeUndefined();
  });
});
