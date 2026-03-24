import type { AuthConfig } from "convex/server";

const issuer = process.env.AUTH_ISSUER ?? "http://localhost:3000";
const applicationID = process.env.CONVEX_APPLICATION_ID ?? "lifeos-dev";

export const convexAuthConfig = {
  providers: [
    {
      type: "customJwt",
      issuer,
      jwks: `${issuer}/auth/.well-known/jwks.json`,
      algorithm: "ES256",
      applicationID,
    },
  ],
} satisfies AuthConfig;

export default convexAuthConfig;
