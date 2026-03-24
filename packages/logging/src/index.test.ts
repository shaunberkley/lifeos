import { describe, expect, it, vi } from "vitest";
import {
  AppError,
  ConfigurationError,
  NotImplementedAppError,
  createLogger,
  getCorrelationId,
  mergeLogContext,
  serializeError,
  toErrorResponse,
} from "./index";

describe("@lifeos/logging", () => {
  it("serializes AppError instances with nested causes", () => {
    const cause = new ConfigurationError("Missing local bridge key", {
      keyPath: "~/Library/Application Support/lifeos/bridge.pem",
    });
    const error = new NotImplementedAppError("Auth is disabled", {
      surface: "auth",
    });
    Object.assign(error, { cause });

    expect(serializeError(error)).toEqual({
      name: "NotImplementedAppError",
      code: "not_implemented",
      message: "Auth is disabled",
      status: 501,
      details: { surface: "auth" },
      cause: {
        name: "ConfigurationError",
        code: "configuration_error",
        message: "Missing local bridge key",
        status: 500,
        details: {
          keyPath: "~/Library/Application Support/lifeos/bridge.pem",
        },
      },
    });
  });

  it("emits structured log events with inherited context", () => {
    const sink = vi.fn();
    const logger = createLogger({
      service: "lifeos-server",
      sink,
      now: () => "2026-03-24T12:00:00.000Z",
      baseContext: { correlationId: "req-1" },
    }).child({
      route: "/auth",
      method: "POST",
    });

    logger.error("request failed", {
      data: { attempt: 1 },
      error: new AppError({
        code: "auth_disabled",
        message: "Auth is disabled",
        status: 501,
      }),
    });

    expect(sink).toHaveBeenCalledWith({
      timestamp: "2026-03-24T12:00:00.000Z",
      level: "error",
      service: "lifeos-server",
      message: "request failed",
      context: {
        correlationId: "req-1",
        route: "/auth",
        method: "POST",
      },
      data: { attempt: 1 },
      error: {
        name: "AppError",
        code: "auth_disabled",
        message: "Auth is disabled",
        status: 501,
      },
    });
  });

  it("normalizes error responses and correlation ids", () => {
    expect(
      toErrorResponse(new NotImplementedAppError("Webhook ingress is disabled"), {
        correlationId: getCorrelationId("req-123"),
      }),
    ).toEqual({
      ok: false,
      error: "not_implemented",
      message: "Webhook ingress is disabled",
      correlationId: "req-123",
    });
  });

  it("covers context merging and correlation id fallbacks", () => {
    expect(mergeLogContext({}, undefined)).toBeUndefined();
    expect(mergeLogContext({ correlationId: "req-1" }, undefined)).toEqual({
      correlationId: "req-1",
    });
    expect(
      mergeLogContext(
        { correlationId: "req-1", route: "/auth" },
        { route: "/health", method: "GET" },
      ),
    ).toEqual({
      correlationId: "req-1",
      route: "/health",
      method: "GET",
    });
    expect(getCorrelationId("   ", () => "generated-id")).toBe("generated-id");
    expect(getCorrelationId(" req-keep ")).toBe("req-keep");
  });

  it("serializes unexpected errors and omits missing correlation ids", () => {
    expect(serializeError(new Error("boom"))).toEqual({
      name: "Error",
      code: "unexpected_error",
      message: "boom",
      status: 500,
    });
    expect(serializeError(42)).toEqual({
      name: "UnknownError",
      code: "unexpected_error",
      message: "An unknown error was thrown.",
      status: 500,
      details: { value: 42 },
    });
    expect(toErrorResponse(new Error("boom"))).toEqual({
      ok: false,
      error: "unexpected_error",
      message: "boom",
    });
  });

  it("uses the default sink for stdout and stderr levels", () => {
    const stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderrWrite = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const logger = createLogger({
      service: "lifeos-server",
      now: () => "2026-03-24T12:00:00.000Z",
    });

    logger.info("request started");
    logger.error("request failed");

    expect(stdoutWrite).toHaveBeenCalledTimes(1);
    expect(stderrWrite).toHaveBeenCalledTimes(1);

    stdoutWrite.mockRestore();
    stderrWrite.mockRestore();
  });
});
