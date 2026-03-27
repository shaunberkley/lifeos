import { createLogger, getCorrelationId } from "@lifeos/logging";
import { Hono } from "hono";
import type { AppVariables } from "./context";
import { authRoute } from "./routes/auth";
import { githubWebhooksRoute } from "./routes/github-webhooks";
import { healthRoute } from "./routes/health";
import { providersRoute } from "./routes/providers";
import { reviewsRoute } from "./routes/reviews";
import { webhooksRoute } from "./routes/webhooks";

export function createApp() {
  const app = new Hono<{ Variables: AppVariables }>();
  const logger = createLogger({ service: "lifeos-server" });

  app.use("*", async (c, next) => {
    const correlationId = getCorrelationId(c.req.header("x-correlation-id"));
    const requestLogger = logger.child({
      correlationId,
      method: c.req.method,
      route: c.req.path,
      requestId: correlationId,
    });
    c.set("correlationId", correlationId);
    c.set("logger", requestLogger);
    c.header("x-correlation-id", correlationId);
    requestLogger.info("request started");
    await next();
    requestLogger.info("request completed", {
      data: { status: c.res.status },
    });
  });

  app.route("/auth", authRoute);
  app.route("/health", healthRoute);
  app.route("/webhooks", webhooksRoute);
  app.route("/webhooks", githubWebhooksRoute);
  app.route("/providers", providersRoute);
  app.route("/reviews", reviewsRoute);

  return app;
}
