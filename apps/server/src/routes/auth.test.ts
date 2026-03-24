import { describe, expect, it } from "vitest";
import { authRoute } from "./auth";

describe("auth route", () => {
  it("fails closed with not implemented", async () => {
    const response = await authRoute.request("http://lifeos.test/auth");

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "not_implemented",
      message:
        "Auth is disabled until Better Auth, JWT issuance, and Convex verification are wired.",
    });
  });
});
