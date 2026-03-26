export type ReviewerProviderStatus = {
  readonly provider: "github";
  readonly displayName: string;
  readonly repository?: string;
  readonly webhookConfigured: boolean;
  readonly publishConfigured: boolean;
  readonly webhookEndpoint: "/webhooks/github";
  readonly reviewRoutes: {
    readonly list: "/reviews";
    readonly detailPattern: "/reviews/:reviewId";
    readonly publishPattern: "/reviews/:reviewId/publish";
  };
  readonly capabilities: readonly string[];
  readonly requiredEnvironment: readonly string[];
};

export type ReviewerReviewJob = {
  readonly id: string;
  readonly provider: "github";
  readonly deliveryId: string;
  readonly repository: string;
  readonly pullRequestNumber: number;
  readonly pullRequestTitle: string;
  readonly pullRequestUrl: string;
  readonly headSha: string;
  readonly baseSha: string;
  readonly action: "opened" | "reopened" | "synchronize" | "ready_for_review";
  readonly draft: boolean;
  readonly author: string;
  readonly idempotencyKey: string;
  readonly eventType: `github.pull_request.${string}`;
  readonly status: "queued" | "published" | "failed";
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly publication?: {
    readonly publishedAt?: string;
    readonly summaryCommentUrl?: string;
    readonly inlineCommentUrls: readonly string[];
  };
};

export type ReviewerApiSnapshot = {
  readonly source: "live" | "partial" | "fallback";
  readonly providers: readonly ReviewerProviderStatus[];
  readonly providersLoaded: boolean;
  readonly reviews: readonly ReviewerReviewJob[];
  readonly reviewsLoaded: boolean;
  readonly errors: readonly string[];
};

type ApiListResponse<T> = {
  readonly ok: true;
} & T;

function getEnvironmentBaseUrl() {
  // Vite injects env at runtime; type-safe access requires the cast through unknown
  const meta = import.meta as unknown as { env: Record<string, string | undefined> };
  const environment = meta.env;
  const override = environment.VITE_LIFEOS_API_URL?.trim();

  if (override) {
    return override.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

async function fetchJson<T>(fetchImpl: typeof fetch, baseUrl: string, path: string) {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`GET ${path} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function parseSnapshotErrors(results: Array<PromiseSettledResult<unknown>>) {
  return results.flatMap((result) =>
    result.status === "rejected"
      ? [result.reason instanceof Error ? result.reason.message : String(result.reason)]
      : [],
  );
}

export function resolveReviewerApiBaseUrl() {
  return getEnvironmentBaseUrl();
}

export async function loadReviewerApiSnapshot(
  fetchImpl: typeof fetch = fetch,
  apiBaseUrl = resolveReviewerApiBaseUrl(),
): Promise<ReviewerApiSnapshot> {
  if (!apiBaseUrl) {
    return {
      source: "fallback",
      providers: [],
      providersLoaded: false,
      reviews: [],
      reviewsLoaded: false,
      errors: [
        "Missing reviewer API base URL. Set VITE_LIFEOS_API_URL or serve LifeOS on the same origin.",
      ],
    };
  }

  const [providersResult, reviewsResult] = await Promise.allSettled([
    fetchJson<ApiListResponse<{ readonly providers: readonly ReviewerProviderStatus[] }>>(
      fetchImpl,
      apiBaseUrl,
      "/providers",
    ),
    fetchJson<ApiListResponse<{ readonly reviews: readonly ReviewerReviewJob[] }>>(
      fetchImpl,
      apiBaseUrl,
      "/reviews",
    ),
  ]);

  const errors = parseSnapshotErrors([providersResult, reviewsResult]);
  const providers = providersResult.status === "fulfilled" ? providersResult.value.providers : [];
  const reviews = reviewsResult.status === "fulfilled" ? reviewsResult.value.reviews : [];

  const source =
    errors.length === 0
      ? "live"
      : providers.length > 0 || reviews.length > 0
        ? "partial"
        : "fallback";

  return {
    source,
    providers,
    providersLoaded: providersResult.status === "fulfilled",
    reviews,
    reviewsLoaded: reviewsResult.status === "fulfilled",
    errors,
  };
}
