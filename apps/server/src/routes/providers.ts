import { AppError, createLogger, toErrorResponse } from "@lifeos/logging";
import { Hono } from "hono";
import type { AppVariables } from "../context";
import { getGitHubProviderStatus } from "../github/config";
import { getGitHubProviderCatalog } from "../github/provider";

const fallbackLogger = createLogger({
  service: "lifeos-server",
  sink: () => {},
});

function toRouteStatusCode(error: unknown) {
  return error instanceof AppError ? (error.status as 400 | 403 | 404 | 500 | 501 | 503) : 500;
}

export const providersRoute = new Hono<{ Variables: AppVariables }>()
  .get("/", (c) => {
    const logger = c.get("logger") ?? fallbackLogger;

    try {
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
  .get("/github", (c) => {
    const logger = c.get("logger") ?? fallbackLogger;

    try {
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
