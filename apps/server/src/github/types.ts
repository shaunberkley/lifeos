export const SUPPORTED_PULL_REQUEST_ACTIONS = [
  "opened",
  "reopened",
  "synchronize",
  "ready_for_review",
] as const;

export type SupportedPullRequestAction = (typeof SUPPORTED_PULL_REQUEST_ACTIONS)[number];

export type GitHubRepositoryRef = {
  readonly fullName: string;
  readonly owner: string;
  readonly name: string;
};

export type GitHubWebhookHeaders = {
  readonly event: string;
  readonly deliveryId: string;
  readonly signature256: string;
};

export type GitHubPullRequestWebhookPayload = {
  readonly action: string;
  readonly number: number;
  readonly repository: {
    readonly full_name: string;
  };
  readonly pull_request: {
    readonly number: number;
    readonly title: string;
    readonly body: string | null;
    readonly draft: boolean;
    readonly html_url: string;
    readonly head: {
      readonly sha: string;
      readonly ref: string;
      readonly repo: {
        readonly full_name: string;
      };
    };
    readonly base: {
      readonly sha: string;
      readonly ref: string;
      readonly repo: {
        readonly full_name: string;
      };
    };
    readonly user: {
      readonly login: string;
    };
  };
  readonly sender: {
    readonly login: string;
  };
};

export type GitHubReviewJobStatus = "queued" | "running" | "published" | "failed";

export type GitHubReviewExecution = {
  readonly startedAt?: string;
  readonly finishedAt?: string;
  readonly findingsCount?: number;
  readonly specialistCount?: number;
  readonly outcome?: "approve" | "request_changes" | "comment";
  readonly overallRisk?: "critical" | "high" | "medium" | "low" | "info";
  readonly summary?: string;
  readonly summaryMarkdown?: string;
  readonly artifactManifest?: {
    readonly version: 1;
    readonly createdAt: string;
    readonly entries: readonly {
      readonly path: string;
      readonly sha256: string;
      readonly bytes: number;
      readonly kind: "text" | "json";
    }[];
  };
  readonly artifacts?: {
    readonly diffManifest: {
      readonly createdAt: string;
      readonly repositoryRoot: string;
      readonly pullRequest: {
        readonly number: number;
        readonly repo: string;
        readonly baseRefName?: string;
        readonly headRefName?: string;
        readonly title?: string;
        readonly url?: string;
      };
      readonly files: readonly {
        readonly path: string;
        readonly additions: number;
        readonly deletions: number;
        readonly patch?: string;
      }[];
      readonly commitShas: readonly string[];
      readonly rawDiff: string;
    };
    readonly contextManifest: {
      readonly createdAt: string;
      readonly repositoryRoot: string;
      readonly reviewDepth: "standard" | "deep";
      readonly specialists: readonly string[];
      readonly rubric: {
        readonly name: string;
        readonly version: string;
      };
      readonly prompt: {
        readonly id: string;
        readonly version: string;
      };
    };
  };
  readonly findings?: readonly {
    readonly severity: "critical" | "high" | "medium" | "low" | "info";
    readonly title: string;
    readonly rationale: string;
    readonly suggestedFix: string;
    readonly filePath?: string;
    readonly line?: number;
  }[];
  readonly error?: string;
};

export type GitHubReviewJob = {
  readonly id: string;
  readonly provider: "github";
  readonly deliveryId: string;
  readonly repository: string;
  readonly pullRequestNumber: number;
  readonly pullRequestTitle: string;
  readonly pullRequestUrl: string;
  readonly headSha: string;
  readonly baseSha: string;
  readonly action: SupportedPullRequestAction;
  readonly draft: boolean;
  readonly author: string;
  readonly idempotencyKey: string;
  readonly eventType: `github.pull_request.${SupportedPullRequestAction}`;
  readonly status: GitHubReviewJobStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly execution?: GitHubReviewExecution;
  readonly publication: {
    readonly publishedAt?: string;
    readonly summaryCommentUrl?: string;
    readonly inlineCommentUrls: readonly string[];
  };
};

export type GitHubReviewJobDraft = Omit<
  GitHubReviewJob,
  "id" | "status" | "createdAt" | "updatedAt" | "publication"
> & {
  readonly publication?: GitHubReviewJob["publication"];
};

export type GitHubInlineCommentDraft = {
  readonly path: string;
  readonly line: number;
  readonly side: "LEFT" | "RIGHT";
  readonly body: string;
};

export type GitHubPublishReviewRequest = {
  readonly summaryComment: {
    readonly body: string;
  };
  readonly inlineComments: readonly GitHubInlineCommentDraft[];
};

export type GitHubPublishSummaryCommentInput = {
  readonly repository: GitHubRepositoryRef;
  readonly pullRequestNumber: number;
  readonly body: string;
};

export type GitHubPublishInlineCommentInput = {
  readonly repository: GitHubRepositoryRef;
  readonly pullRequestNumber: number;
  readonly commitSha: string;
  readonly path: string;
  readonly line: number;
  readonly side: "LEFT" | "RIGHT";
  readonly body: string;
};

export type GitHubPublishResult = {
  readonly summaryCommentUrl: string;
  readonly inlineCommentUrls: readonly string[];
};

export type GitHubProviderStatus = {
  readonly provider: "github";
  readonly displayName: "GitHub";
  readonly repository?: string;
  readonly webhookConfigured: boolean;
  readonly publishConfigured: boolean;
  readonly webhookEndpoint: "/webhooks/github";
  readonly reviewRoutes: {
    readonly list: "/reviews";
    readonly detailPattern: "/reviews/:reviewId";
    readonly publishPattern: "/reviews/:reviewId/publish";
    readonly executePattern: "/reviews/:reviewId/run";
  };
  readonly capabilities: readonly [
    "pull_request_webhooks",
    "queued_review_jobs",
    "inline_review_comments",
    "summary_review_comments",
  ];
  readonly requiredEnvironment: readonly [
    "GITHUB_WEBHOOK_SECRET",
    "GITHUB_REPOSITORY",
    "GITHUB_TOKEN",
  ];
};

export type ReviewerProviderStatus = {
  readonly provider: "reviewer";
  readonly id: "codex-cli" | "claude-code";
  readonly family: "codex" | "claude";
  readonly displayName: string;
  readonly status: "ready" | "placeholder";
  readonly defaultModelClass: "local" | "remote";
  readonly supportedModelClasses: readonly ("local" | "remote")[];
  readonly capabilities: readonly string[];
  readonly notes?: string;
};

export type ProviderCatalogEntry = GitHubProviderStatus | ReviewerProviderStatus;
