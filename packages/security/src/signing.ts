import { createHmac, timingSafeEqual } from "node:crypto";
import type { JsonObject, JsonValue } from "./json";
import type { DataClass } from "./policy";

export type SigningSecret = string | Uint8Array;

export type SignedEnvelope<T extends JsonValue = JsonValue> = {
  readonly version: 1;
  readonly keyId: string;
  readonly dataClass: DataClass;
  readonly issuedAt: string;
  readonly payload: T;
  readonly signature: string;
};

export type SignedEnvelopeInput<T extends JsonValue = JsonValue> = {
  readonly keyId: string;
  readonly dataClass: DataClass;
  readonly payload: T;
  readonly issuedAt?: string;
};

function base64UrlEncode(value: Buffer) {
  return value.toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url");
}

function secretToBuffer(secret: SigningSecret) {
  return typeof secret === "string" ? Buffer.from(secret, "utf8") : Buffer.from(secret);
}

export function canonicalizeJson(value: JsonValue): string {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) {
        throw new Error("JSON payloads cannot contain non-finite numbers.");
      }
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "object": {
      if (Array.isArray(value)) {
        return `[${value.map((item) => canonicalizeJson(item)).join(",")}]`;
      }

      const objectValue = value as JsonObject;
      const entries = Object.keys(objectValue)
        .sort()
        .map((key) => {
          const item = objectValue[key];

          if (item === undefined) {
            throw new Error("JSON payloads cannot contain undefined values.");
          }

          return `${JSON.stringify(key)}:${canonicalizeJson(item)}`;
        });

      return `{${entries.join(",")}}`;
    }
    default:
      throw new Error("JSON payloads must be serializable primitives.");
  }
}

function signingMaterial<T extends JsonValue>(envelope: {
  readonly version: 1;
  readonly keyId: string;
  readonly dataClass: DataClass;
  readonly issuedAt: string;
  readonly payload: T;
}) {
  return canonicalizeJson(envelope);
}

function signBytes(material: string, secret: SigningSecret) {
  return createHmac("sha256", secretToBuffer(secret)).update(material, "utf8").digest();
}

export function createSignedEnvelope<T extends JsonValue>(
  input: SignedEnvelopeInput<T>,
  secret: SigningSecret,
): SignedEnvelope<T> {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const unsigned = {
    version: 1 as const,
    keyId: input.keyId,
    dataClass: input.dataClass,
    issuedAt,
    payload: input.payload,
  };

  const signature = base64UrlEncode(signBytes(signingMaterial(unsigned), secret));

  return {
    ...unsigned,
    signature,
  };
}

export function verifySignedEnvelope<T extends JsonValue>(
  envelope: SignedEnvelope<T>,
  secret: SigningSecret,
) {
  const expectedSignature = signBytes(
    signingMaterial({
      version: envelope.version,
      keyId: envelope.keyId,
      dataClass: envelope.dataClass,
      issuedAt: envelope.issuedAt,
      payload: envelope.payload,
    }),
    secret,
  );

  const actualSignature = base64UrlDecode(envelope.signature);

  if (actualSignature.length !== expectedSignature.length) {
    return false;
  }

  return timingSafeEqual(actualSignature, expectedSignature);
}

export function redactSecret(value: string) {
  if (value.length <= 4) {
    return "****";
  }

  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}
