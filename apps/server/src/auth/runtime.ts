import fs from "node:fs/promises";
import path from "node:path";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { ConfigurationError } from "@lifeos/logging";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { jwt } from "better-auth/plugins";
import { Kysely } from "kysely";
import { AUTH_BASE_PATH, AUTH_JWKS_PATH, getAuthEnvironment } from "./config";

type RuntimeAuth = {
  handler: (request: Request) => Promise<Response>;
  api: {
    getJwks: (input: { headers: Headers }) => Promise<{ keys: unknown[] }>;
    signJWT: (input: { body: { payload: Record<string, unknown> } }) => Promise<{ token: string }>;
  };
  options: Parameters<typeof getMigrations>[0];
};

type AuthRuntime = {
  auth: RuntimeAuth;
  database: Kysely<unknown>;
};

let authRuntimePromise: Promise<AuthRuntime> | undefined;

async function createAuthRuntime(): Promise<AuthRuntime> {
  const environment = getAuthEnvironment();

  await fs.mkdir(path.dirname(environment.databasePath), { recursive: true });

  const database = new Kysely<unknown>({
    dialect: new LibsqlDialect({
      url: `file:${environment.databasePath}`,
    }),
  });

  const auth: RuntimeAuth = betterAuth({
    secret: environment.secret,
    baseURL: environment.issuer,
    basePath: AUTH_BASE_PATH,
    trustedOrigins: [environment.issuer, environment.webOrigin],
    database: {
      db: database,
      type: "sqlite",
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      jwt({
        jwks: {
          jwksPath: AUTH_JWKS_PATH,
          keyPairConfig: {
            alg: "ES256",
          },
        },
        jwt: {
          issuer: environment.issuer,
          audience: environment.applicationId,
          expirationTime: "15m",
        },
      }),
    ],
  });

  try {
    const migrations = await getMigrations(auth.options);
    await migrations.runMigrations();
    const jwks = await auth.api.getJwks({
      headers: new Headers(),
    });

    if (jwks.keys.length === 0) {
      await auth.api.signJWT({
        body: {
          payload: {
            aud: environment.applicationId,
            scope: "bootstrap",
            sub: "lifeos-bootstrap",
          },
        },
      });
    }
  } catch (error) {
    await database.destroy();

    throw new ConfigurationError("Failed to initialize Better Auth database schema.", {
      cause:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
            }
          : {
              value: error,
            },
      databasePath: environment.databasePath,
      surface: "auth",
    });
  }

  return {
    auth,
    database,
  };
}

export async function getAuthRuntime(): Promise<AuthRuntime> {
  authRuntimePromise ??= createAuthRuntime();
  return authRuntimePromise;
}

export async function resetAuthRuntimeForTests() {
  if (!authRuntimePromise) {
    return;
  }

  const runtime = await authRuntimePromise;
  await runtime.database.destroy();
  authRuntimePromise = undefined;
}
