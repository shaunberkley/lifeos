import path from "node:path";
import { ConfigurationError } from "@lifeos/logging";
import { afterEach, describe, expect, it } from "vitest";
import { getAuthEnvironment } from "./config";

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

describe("auth config", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("loads required values and defaults optional ones", () => {
    process.env.AUTH_ISSUER = "http://lifeos.test";
    process.env.CONVEX_APPLICATION_ID = "lifeos-dev";
    process.env.BETTER_AUTH_SECRET = "lifeos-better-auth-test-secret-v1";
    Reflect.deleteProperty(process.env, "WEB_ORIGIN");
    Reflect.deleteProperty(process.env, "AUTH_DATABASE_PATH");

    expect(getAuthEnvironment()).toEqual({
      issuer: "http://lifeos.test",
      applicationId: "lifeos-dev",
      secret: "lifeos-better-auth-test-secret-v1",
      webOrigin: "http://localhost:1337",
      databasePath: path.resolve(process.cwd(), "./data/auth.sqlite"),
    });
  });

  it("throws a configuration error when a required variable is blank", () => {
    process.env.AUTH_ISSUER = " ";
    process.env.CONVEX_APPLICATION_ID = "lifeos-dev";
    process.env.BETTER_AUTH_SECRET = "lifeos-better-auth-test-secret-v1";

    expect(() => getAuthEnvironment()).toThrowError(ConfigurationError);
    expect(() => getAuthEnvironment()).toThrowError(
      "Missing required auth environment variable: AUTH_ISSUER",
    );
  });
});
