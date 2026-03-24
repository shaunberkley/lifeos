export interface IntegrationManifest {
  provider: string;
  displayName: string;
  mode: "cloud" | "local" | "hybrid";
  syncStrategy: "poll" | "webhook" | "file-watch" | "manual-import";
  defaultDataClass: "public" | "private" | "restricted" | "derived";
  supportsBackfill: boolean;
}
