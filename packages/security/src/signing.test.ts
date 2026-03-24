import { describe, expect, it } from "vitest";
import { createSignedEnvelope, redactSecret, verifySignedEnvelope } from "./index";
import { canonicalizeJson } from "./signing";

describe("@lifeos/security signing helpers", () => {
  it("signs and verifies canonical envelopes", () => {
    const secret = "test-secret";
    const envelope = createSignedEnvelope(
      {
        keyId: "local-bridge",
        dataClass: "restricted",
        payload: {
          nested: {
            alpha: 1,
            beta: true,
          },
          message: "hello",
        },
      },
      secret,
    );

    expect(verifySignedEnvelope(envelope, secret)).toBe(true);
    expect(verifySignedEnvelope({ ...envelope, signature: "AAAA" }, secret)).toBe(false);
    expect(verifySignedEnvelope(envelope, "wrong-secret")).toBe(false);
  });

  it("canonicalizes payload keys before signing", () => {
    const secret = "test-secret";
    const left = createSignedEnvelope(
      {
        keyId: "local-bridge",
        dataClass: "restricted",
        issuedAt: "2026-03-23T00:00:00.000Z",
        payload: {
          z: 3,
          a: 1,
          nested: {
            beta: true,
            alpha: "alpha",
          },
        },
      },
      secret,
    );
    const right = createSignedEnvelope(
      {
        keyId: "local-bridge",
        dataClass: "restricted",
        issuedAt: "2026-03-23T00:00:00.000Z",
        payload: {
          a: 1,
          nested: {
            alpha: "alpha",
            beta: true,
          },
          z: 3,
        },
      },
      secret,
    );

    expect(left.signature).toBe(right.signature);
    expect(canonicalizeJson({ z: 3, a: 1, nested: { beta: true, alpha: "alpha" } })).toBe(
      canonicalizeJson({ a: 1, nested: { alpha: "alpha", beta: true }, z: 3 }),
    );
  });

  it("supports binary signing secrets and redacts secret material", () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5, 6]);
    const envelope = createSignedEnvelope(
      {
        keyId: "local-bridge",
        dataClass: "private",
        issuedAt: "2026-03-23T00:00:00.000Z",
        payload: { message: "hello" },
      },
      secret,
    );

    expect(verifySignedEnvelope(envelope, secret)).toBe(true);
    expect(redactSecret("super-secret-token")).toBe("su****en");
    expect(redactSecret("abcd")).toBe("****");
  });

  it("rejects non-serializable JSON payloads", () => {
    expect(() => canonicalizeJson({ invalid: undefined as never })).toThrow(
      /cannot contain undefined values/,
    );
    expect(() => canonicalizeJson(Number.POSITIVE_INFINITY)).toThrow(
      /cannot contain non-finite numbers/,
    );
  });
});
