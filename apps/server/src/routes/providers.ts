import { AppError, createLogger, toErrorResponse } from "@lifeos/logging";
import { Hono } from "hono";
import { type JSONWebKeySet, createLocalJWKSet, jwtVerify } from "jose";
import { getAuthEnvironment } from "../auth/config";
import { getAuthRuntime } from "../auth/runtime";
import type { AppVariables } from "../context";
import { getGitHubProviderStatus } from "../github/config";
import { getGitHubProviderCatalog } from "../github/provider";

const fallbackLogger = createLogger({
  service: "lifeos-server",
  sink: () => {},
});

function toRouteStatusCode(error: unknown) {
  return error instanceof AppError
    ? (error.status as 400 | 401 | 403 | 404 | 500 | 501 | 503)
    : 500;
}

function createUnauthorizedError() {
  return new AppError({
    code: "unauthorized",
    message: "Reviewer control-plane access requires authentication.",
    status: 401,
    details: {
      surface: "review-control-plane",
    },
  });
}

async function requireControlPlaneAuth(c: {
  readonly req: { header: (name: string) => string | undefined };
}) {
  const authorization = c.req.header("authorization")?.trim();

  if (!authorization?.startsWith("Bearer ")) {
    throw createUnauthorizedError();
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    throw createUnauthorizedError();
  }

  const { auth } = await getAuthRuntime();
  const jwks = await auth.api.getJwks({
    headers: new Headers(),
  });
  const environment = getAuthEnvironment();

  await jwtVerify(token, createLocalJWKSet(jwks as JSONWebKeySet), {
    issuer: environment.issuer,
    audience: environment.applicationId,
  });
}

export const providersRoute = new Hono<{ Variables: AppVariables }>()
  .get("/", async (c) => {
    const logger = c.get("logger") ?? fallbackLogger;

    try {
      await requireControlPlaneAuth(c);
      return c.json({
        ok: true,
        providers: getGitHubProviderCatalog(),
      });
    } catch (error) {
      logger.error("provider catalog request failed", { error });
      return c.json(
        toErrorResponse(error, {
          correlationId: c.get("correlationId"),
        }),
        toRouteStatusCode(error),
      );
    }
  })
  .get("/github", async (c) => {
    const logger = c.get("logger") ?? fallbackLogger;

    try {
      await requireControlPlaneAuth(c);
      return c.json({
        ok: true,
        provider: getGitHubProviderStatus(),
      });
    } catch (error) {
      logger.error("github provider status request failed", { error });
      return c.json(
        toErrorResponse(error, {
          correlationId: c.get("correlationId"),
        }),
        toRouteStatusCode(error),
      );
    }
  });
