type ConvexAuthConfig = {
  providers: Array<{
    type: "customJwt";
    issuer: string;
    jwks: string;
    algorithm: "ES256";
    applicationID: string;
  }>;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value || value === "undefined" || value === "null") {
    throw new Error(`Missing required Convex auth environment variable: ${name}`);
  }

  return value;
}

export function getConvexAuthConfig(): ConvexAuthConfig {
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
  } satisfies ConvexAuthConfig;
}

export const convexAuthConfig = getConvexAuthConfig();

export default convexAuthConfig;
