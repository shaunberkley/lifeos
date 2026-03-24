import type {
  DataClass,
  ModelClass,
  ReviewCapability,
  ReviewProviderAdapter,
  ReviewProviderDescriptor,
  ReviewProviderId,
  ReviewProviderSelection,
  ReviewResolutionRequest,
} from "./types";

const DEFAULT_PROVIDER_PREFERENCE: readonly ReviewProviderId[] = ["codex-cli", "claude-code"];

export class ModelPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelPolicyError";
  }
}

export class ReviewProviderResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewProviderResolutionError";
  }
}

export function assertModelAllowed(dataClass: DataClass, modelClass: ModelClass) {
  if (dataClass === "restricted" && modelClass !== "local") {
    throw new ModelPolicyError("Restricted data must stay on local models");
  }
}

export function resolveRequestedModelClass(
  request: ReviewResolutionRequest,
  descriptor: ReviewProviderDescriptor,
): ModelClass {
  const resolvedModelClass =
    request.modelClass ??
    (request.dataClass === "restricted" ? "local" : descriptor.defaultModelClass);

  assertModelAllowed(request.dataClass, resolvedModelClass);

  if (!descriptor.supportedModelClasses.includes(resolvedModelClass)) {
    throw new ReviewProviderResolutionError(
      `${descriptor.id} does not support ${resolvedModelClass} review execution`,
    );
  }

  return resolvedModelClass;
}

export function getMissingCapabilities(
  descriptor: ReviewProviderDescriptor,
  requiredCapabilities: readonly ReviewCapability[] = [],
): readonly ReviewCapability[] {
  return requiredCapabilities.filter((capability) => !descriptor.capabilities.includes(capability));
}

export function providerSupportsCapabilities(
  descriptor: ReviewProviderDescriptor,
  requiredCapabilities: readonly ReviewCapability[] = [],
): boolean {
  return getMissingCapabilities(descriptor, requiredCapabilities).length === 0;
}

export function resolveReviewProvider(
  adapters: readonly ReviewProviderAdapter[],
  request: ReviewResolutionRequest,
): ReviewProviderSelection {
  const preferredProviders = request.preferredProviders ?? DEFAULT_PROVIDER_PREFERENCE;

  const rankedAdapters = [...adapters].sort((left, right) => {
    const leftRank = preferredProviders.indexOf(left.descriptor.id);
    const rightRank = preferredProviders.indexOf(right.descriptor.id);
    const normalizedLeftRank = leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank;
    const normalizedRightRank = rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank;

    if (normalizedLeftRank !== normalizedRightRank) {
      return normalizedLeftRank - normalizedRightRank;
    }

    if (left.descriptor.status !== right.descriptor.status) {
      return left.descriptor.status === "ready" ? -1 : 1;
    }

    return left.descriptor.id.localeCompare(right.descriptor.id);
  });

  let fallback: ReviewProviderSelection | undefined;

  for (const adapter of rankedAdapters) {
    let modelClass: ModelClass;

    try {
      modelClass = resolveRequestedModelClass(request, adapter.descriptor);
    } catch {
      continue;
    }

    const missingCapabilities = getMissingCapabilities(
      adapter.descriptor,
      request.requiredCapabilities,
    );

    const selection: ReviewProviderSelection = {
      adapter,
      descriptor: adapter.descriptor,
      missingCapabilities,
      modelClass,
    };

    if (missingCapabilities.length === 0 && adapter.descriptor.status === "ready") {
      return selection;
    }

    if (!fallback) {
      fallback = selection;
    }
  }

  if (fallback) {
    const capabilitySummary =
      fallback.missingCapabilities.length > 0
        ? `missing capabilities: ${fallback.missingCapabilities.join(", ")}`
        : `status: ${fallback.descriptor.status}`;

    throw new ReviewProviderResolutionError(
      `No ready provider matched the request (${capabilitySummary})`,
    );
  }

  throw new ReviewProviderResolutionError("No provider supports the requested model policy");
}
