import { describe, expect, it } from "vitest";
import { disabledAuthConfig } from "./auth.config";

describe("convex auth config", () => {
  it("makes the disabled auth posture explicit", () => {
    expect(disabledAuthConfig.providers).toHaveLength(1);
    expect(disabledAuthConfig.providers[0]).toMatchObject({
      type: "customJwt",
      issuer: "https://auth.lifeos.invalid",
      jwks: "https://auth.lifeos.invalid/.well-known/jwks.json",
      algorithm: "ES256",
      applicationID: "lifeos-disabled",
    });
  });
});
