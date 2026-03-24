import { ConfigurationError } from "@lifeos/logging";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as runtimeModule from "../auth/runtime";
import { authRoute } from "./auth";

describe("auth route mocked branches", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("proxies non-JWKS requests to the Better Auth handler", async () => {
    const handler = vi
      .fn<(request: Request) => Promise<Response>>()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const getJwks = vi.fn().mockResolvedValue({ keys: [] });

    vi.spyOn(runtimeModule, "getAuthRuntime").mockResolvedValue({
      auth: {
        api: {
          getJwks,
          signJWT: vi.fn(),
        },
        handler,
        options: {} as never,
      },
      database: {
        destroy: vi.fn(),
      } as never,
    });

    const response = await authRoute.request("http://lifeos.test/auth/sign-in", {
      method: "POST",
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0].url).toBe("http://lifeos.test/auth/sign-in");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("returns a structured 500 when JWKS lookup fails", async () => {
    vi.spyOn(runtimeModule, "getAuthRuntime").mockRejectedValue(
      new ConfigurationError("Missing required auth environment variable: AUTH_ISSUER", {
        name: "AUTH_ISSUER",
        surface: "auth",
      }),
    );

    const response = await authRoute.request("http://lifeos.test/auth/.well-known/jwks.json", {
      method: "GET",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "configuration_error",
      message: "Missing required auth environment variable: AUTH_ISSUER",
    });
  });

  it("returns a structured 500 when the auth handler throws", async () => {
    const handler = vi.fn<(request: Request) => Promise<Response>>().mockRejectedValue(
      new ConfigurationError("Failed to initialize Better Auth database schema.", {
        surface: "auth",
      }),
    );

    vi.spyOn(runtimeModule, "getAuthRuntime").mockResolvedValue({
      auth: {
        api: {
          getJwks: vi.fn(),
          signJWT: vi.fn(),
        },
        handler,
        options: {} as never,
      },
      database: {
        destroy: vi.fn(),
      } as never,
    });

    const response = await authRoute.request("http://lifeos.test/auth/sign-in", {
      method: "POST",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "configuration_error",
      message: "Failed to initialize Better Auth database schema.",
    });
  });
});
