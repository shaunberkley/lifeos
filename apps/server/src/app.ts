import { Hono } from "hono";
import { authRoute } from "./routes/auth";
import { healthRoute } from "./routes/health";
import { webhooksRoute } from "./routes/webhooks";

export function createApp() {
  const app = new Hono();

  app.route("/auth", authRoute);
  app.route("/health", healthRoute);
  app.route("/webhooks", webhooksRoute);

  return app;
}
