import { NotImplementedAppError, createLogger, toErrorResponse } from "@lifeos/logging";
import { Hono } from "hono";
import type { AppVariables } from "../context";

const fallbackLogger = createLogger({
  service: "lifeos-server",
  sink: () => {},
});

export const authRoute = new Hono<{ Variables: AppVariables }>().all("*", (c) => {
  const error = new NotImplementedAppError(
    "Auth is disabled until Better Auth, JWT issuance, and Convex verification are wired.",
    { surface: "auth" },
  );
  const logger = c.get("logger") ?? fallbackLogger;
  logger.warn("auth request rejected", { error });
  return c.json(toErrorResponse(error, { correlationId: c.get("correlationId") }), 501);
});
