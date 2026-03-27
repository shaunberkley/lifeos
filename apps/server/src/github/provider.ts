import { createClaudePlaceholderAdapter, createCodexReviewAdapter } from "@lifeos/ai-runtime";
import { getGitHubProviderStatus } from "./config";
import type { ProviderCatalogEntry, ReviewerProviderStatus } from "./types";

function toReviewerProviderStatus(
  adapter:
    | ReturnType<typeof createCodexReviewAdapter>
    | ReturnType<typeof createClaudePlaceholderAdapter>,
): ReviewerProviderStatus {
  return {
    provider: "reviewer",
    id: adapter.descriptor.id,
    family: adapter.descriptor.family,
    displayName: adapter.descriptor.displayName,
    status: adapter.descriptor.status,
    defaultModelClass: adapter.descriptor.defaultModelClass,
    supportedModelClasses: adapter.descriptor.supportedModelClasses,
    capabilities: adapter.descriptor.capabilities,
    ...(adapter.descriptor.notes ? { notes: adapter.descriptor.notes } : {}),
  };
}

export function getGitHubProviderCatalog(): readonly ProviderCatalogEntry[] {
  return [
    getGitHubProviderStatus(),
    toReviewerProviderStatus(createCodexReviewAdapter()),
    toReviewerProviderStatus(createClaudePlaceholderAdapter()),
  ];
}
