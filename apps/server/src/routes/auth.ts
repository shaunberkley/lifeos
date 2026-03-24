import { createLogger, toErrorResponse } from "@lifeos/logging";
import { type Context, Hono } from "hono";
import { getAuthRuntime } from "../auth/runtime";
import type { AppVariables } from "../context";

const fallbackLogger = createLogger({
  service: "lifeos-server",
  sink: () => {},
});

function toAuthErrorResponse(c: Context<{ Variables: AppVariables }>, error: unknown) {
  const logger = c.get("logger") ?? fallbackLogger;

  logger.error("auth request failed", { error });
  return c.json(
    toErrorResponse(error, {
      correlationId: c.get("correlationId"),
    }),
    500,
  );
}

export const authRoute = new Hono<{ Variables: AppVariables }>()
  .get("/.well-known/jwks.json", async (c) => {
    try {
      const { auth } = await getAuthRuntime();
      const jwks = await auth.api.getJwks({
        headers: c.req.raw.headers,
      });
      return c.json(jwks);
    } catch (error) {
      return toAuthErrorResponse(c, error);
    }
  })
  .all("*", async (c) => {
    try {
      const { auth } = await getAuthRuntime();
      return await auth.handler(c.req.raw);
    } catch (error) {
      return toAuthErrorResponse(c, error);
    }
  });
