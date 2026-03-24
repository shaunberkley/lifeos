import { createHash } from "node:crypto";
import { stableStringify } from "./stable";
import type { ArtifactEntry, ArtifactManifest } from "./types";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createArtifactEntry(
  path: string,
  content: string,
  kind: ArtifactEntry["kind"],
): ArtifactEntry {
  return {
    path,
    sha256: sha256Hex(content),
    bytes: Buffer.byteLength(content, "utf8"),
    kind,
  };
}

export function createArtifactManifest(
  entries: readonly ArtifactEntry[],
  createdAt = new Date().toISOString(),
): ArtifactManifest {
  return {
    version: 1,
    createdAt,
    entries: [...entries].sort((left, right) => left.path.localeCompare(right.path)),
  };
}

export function serializeArtifactJson(value: unknown): string {
  return `${stableStringify(value)}\n`;
}
