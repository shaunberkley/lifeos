import type { AuthConfig } from "convex/server";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required Convex auth environment variable: ${name}`);
  }

  return value;
}

export function getConvexAuthConfig(): AuthConfig {
  const issuer = requireEnv("AUTH_ISSUER");
  const applicationID = requireEnv("CONVEX_APPLICATION_ID");

  return {
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
}

export const convexAuthConfig = getConvexAuthConfig();

export default convexAuthConfig;
