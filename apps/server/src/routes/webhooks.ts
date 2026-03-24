import { Hono } from "hono";

const disabledWebhookResponse = () =>
  ({
    ok: false,
    error: "not_implemented",
    message: "Webhook ingress is disabled until signed event handling is implemented.",
  }) as const;

export const webhooksRoute = new Hono().all("*", (c) => c.json(disabledWebhookResponse(), 501));
