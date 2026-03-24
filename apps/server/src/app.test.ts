import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("@lifeos/server app", () => {
  it("fails closed for auth and webhooks while keeping health available", async () => {
    const app = createApp();

    const authResponse = await app.request("/auth", { method: "POST" });
    expect(authResponse.status).toBe(501);
    await expect(authResponse.json()).resolves.toMatchObject({
      ok: false,
      error: "not_implemented",
    });

    const webhookResponse = await app.request("/webhooks", { method: "POST" });
    expect(webhookResponse.status).toBe(501);
    await expect(webhookResponse.json()).resolves.toMatchObject({
      ok: false,
      error: "not_implemented",
    });

    const healthResponse = await app.request("/health");
    expect(healthResponse.status).toBe(200);
    await expect(healthResponse.json()).resolves.toEqual({
      ok: true,
      service: "lifeos-server",
    });
  });
});
