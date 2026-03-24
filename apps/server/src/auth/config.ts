import path from "node:path";
import { ConfigurationError } from "@lifeos/logging";

type AuthEnvironment = {
  issuer: string;
  applicationId: string;
  databasePath: string;
  secret: string;
  webOrigin: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ConfigurationError(`Missing required auth environment variable: ${name}`, {
      name,
      surface: "auth",
    });
  }

  return value;
}

export function getAuthEnvironment(): AuthEnvironment {
  return {
    issuer: requireEnv("AUTH_ISSUER"),
    applicationId: requireEnv("CONVEX_APPLICATION_ID"),
    databasePath: path.resolve(
      process.cwd(),
      process.env.AUTH_DATABASE_PATH?.trim() || "./data/auth.sqlite",
    ),
    secret: requireEnv("BETTER_AUTH_SECRET"),
    webOrigin: process.env.WEB_ORIGIN?.trim() || "http://localhost:1337",
  };
}

export const AUTH_BASE_PATH = "/auth";
export const AUTH_JWKS_PATH = "/auth/.well-known/jwks.json";
