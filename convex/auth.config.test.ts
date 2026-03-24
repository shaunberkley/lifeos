import { describe, expect, it } from "vitest";
import { convexAuthConfig } from "./auth.config";

describe("convex auth config", () => {
  it("points Convex custom JWT auth at the Better Auth JWKS surface", () => {
    expect(convexAuthConfig.providers).toHaveLength(1);
    expect(convexAuthConfig.providers[0]).toMatchObject({
      type: "customJwt",
      issuer: "http://localhost:3000",
      jwks: "http://localhost:3000/auth/.well-known/jwks.json",
      algorithm: "ES256",
      applicationID: "lifeos-dev",
    });
  });
});
