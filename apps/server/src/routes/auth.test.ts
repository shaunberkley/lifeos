import { describe, expect, it } from "vitest";
import { createApp } from "../app";
import { authRoute } from "./auth";

describe("auth route", () => {
  it("fails closed with not implemented", async () => {
    const response = await authRoute.request("http://lifeos.test/auth", {
      method: "POST",
      headers: {
        "x-correlation-id": "req-auth-1",
      },
    });

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "not_implemented",
      message:
        "Auth is disabled until Better Auth, JWT issuance, and Convex verification are wired.",
      correlationId: undefined,
    });
  });

  it("echoes the correlation id when mounted in the application", async () => {
    const response = await createApp().request("/auth", {
      method: "POST",
      headers: {
        "x-correlation-id": "req-auth-mounted",
      },
    });

    await expect(response.json()).resolves.toMatchObject({
      correlationId: "req-auth-mounted",
    });
  });
});
