import { afterEach, describe, expect, it, vi } from "vitest";

describe("convex auth config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("requires Convex auth issuer and application ID", async () => {
    Reflect.deleteProperty(process.env, "AUTH_ISSUER");
    Reflect.deleteProperty(process.env, "CONVEX_APPLICATION_ID");

    await expect(import("./auth.config")).rejects.toThrow(
      "Missing required Convex auth environment variable: AUTH_ISSUER",
    );
  });

  it("points Convex custom JWT auth at the Better Auth JWKS surface", async () => {
    vi.stubEnv("AUTH_ISSUER", "http://lifeos.test");
    vi.stubEnv("CONVEX_APPLICATION_ID", "lifeos-dev");

    const { convexAuthConfig } = await import("./auth.config");

    expect(convexAuthConfig.providers).toHaveLength(1);
    expect(convexAuthConfig.providers[0]).toMatchObject({
      type: "customJwt",
      issuer: "http://lifeos.test",
      jwks: "http://lifeos.test/auth/.well-known/jwks.json",
      algorithm: "ES256",
      applicationID: "lifeos-dev",
    });
  });
});
