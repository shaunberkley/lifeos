import { describe, expect, it } from "vitest";
import { webhooksRoute } from "./webhooks";

describe("webhook route", () => {
  it("fails closed with not implemented", async () => {
    const response = await webhooksRoute.request("http://lifeos.test/webhooks");

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "not_implemented",
      message: "Webhook ingress is disabled until signed event handling is implemented.",
    });
  });
});
