import { describe, expect, it } from "vitest";
import {
  createArtifactEntry,
  createArtifactManifest,
  serializeArtifactJson,
  sha256Hex,
} from "./artifacts";

describe("review-engine artifacts", () => {
  it("creates deterministic entries and sorted manifests", () => {
    const left = createArtifactEntry("b.json", '{"b":1}\n', "json");
    const right = createArtifactEntry("a.json", '{"a":1}\n', "json");

    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(createArtifactManifest([left, right], "2026-03-24T12:00:00.000Z")).toEqual({
      version: 1,
      createdAt: "2026-03-24T12:00:00.000Z",
      entries: [right, left],
    });
  });

  it("serializes JSON with stable ordering", () => {
    expect(serializeArtifactJson({ z: 1, a: { d: 2, c: 1 } })).toBe('{"a":{"c":1,"d":2},"z":1}\n');
  });
});
