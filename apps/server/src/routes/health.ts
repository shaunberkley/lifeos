import { Hono } from "hono";

export const healthRoute = new Hono().get("/", (c) =>
  c.json({
    ok: true,
    service: "lifeos-server",
  }),
);
