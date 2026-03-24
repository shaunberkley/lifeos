import { serve } from "@hono/node-server";
import { createLogger } from "@lifeos/logging";
import { createApp } from "./app";

const app = createApp();
const logger = createLogger({ service: "lifeos-server" });
const port = Number(process.env.PORT ?? 3000);

serve({
  fetch: app.fetch,
  port,
});

logger.info("server started", {
  data: { port },
});
