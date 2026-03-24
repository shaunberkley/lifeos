import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("@lifeos/server app", () => {
  it("fails closed for auth and webhooks while keeping health available", async () => {
    const app = createApp();

    const authResponse = await app.request("/auth", { method: "POST" });
    expect(authResponse.status).toBe(501);
    expect(authResponse.headers.get("x-correlation-id")).toBeTruthy();
    await expect(authResponse.json()).resolves.toMatchObject({
      ok: false,
      error: "not_implemented",
      correlationId: expect.any(String),
    });

    const webhookResponse = await app.request("/webhooks", { method: "POST" });
    expect(webhookResponse.status).toBe(501);
    expect(webhookResponse.headers.get("x-correlation-id")).toBeTruthy();
    await expect(webhookResponse.json()).resolves.toMatchObject({
      ok: false,
      error: "not_implemented",
      correlationId: expect.any(String),
    });

    const healthResponse = await app.request("/health");
    expect(healthResponse.status).toBe(200);
    await expect(healthResponse.json()).resolves.toMatchObject({
      ok: true,
      service: "lifeos-server",
      correlationId: expect.any(String),
    });
  });
});
