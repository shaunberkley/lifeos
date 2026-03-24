import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { webhooksRoute } from "./webhooks";

describe("webhook route", () => {
  it("fails closed with not implemented", async () => {
    const response = await webhooksRoute.request("http://lifeos.test/", {
      method: "POST",
      headers: {
        "x-correlation-id": "req-hook-1",
      },
    });

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "not_implemented",
      message: "Webhook ingress is disabled until signed event handling is implemented.",
      correlationId: undefined,
    });
  });

  it("echoes the correlation id when mounted in the application", async () => {
    const response = await createApp().request("/webhooks", {
      method: "POST",
      headers: {
        "x-correlation-id": "req-hook-mounted",
      },
    });

    await expect(response.json()).resolves.toMatchObject({
      correlationId: "req-hook-mounted",
    });
  });
});
