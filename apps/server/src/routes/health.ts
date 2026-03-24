import { Hono } from "hono";
import type { AppVariables } from "../context";

export const healthRoute = new Hono<{ Variables: AppVariables }>().get("/", (c) =>
  c.json({
    ok: true,
    correlationId: c.get("correlationId"),
    service: "lifeos-server",
  }),
);
