import { NotImplementedAppError, createLogger, toErrorResponse } from "@lifeos/logging";
import { Hono } from "hono";
import type { AppVariables } from "../context";

const fallbackLogger = createLogger({
  service: "lifeos-server",
  sink: () => {},
});

export const webhooksRoute = new Hono<{ Variables: AppVariables }>().all("/", (c) => {
  const error = new NotImplementedAppError(
    "Webhook ingress is disabled until signed event handling is implemented.",
    { surface: "webhooks" },
  );
  const logger = c.get("logger") ?? fallbackLogger;
  logger.warn("webhook request rejected", { error });
  return c.json(toErrorResponse(error, { correlationId: c.get("correlationId") }), 501);
});
