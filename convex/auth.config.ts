import type { AuthConfig } from "convex/server";

export const disabledAuthConfig = {
  providers: [
    {
      type: "customJwt",
      issuer: "https://auth.lifeos.invalid",
      jwks: "https://auth.lifeos.invalid/.well-known/jwks.json",
      algorithm: "ES256",
      applicationID: "lifeos-disabled",
    },
  ],
} satisfies AuthConfig;

export default disabledAuthConfig;
