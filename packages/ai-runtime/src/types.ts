export type DataClass = "public" | "private" | "restricted" | "derived";

export type ModelClass = "local" | "remote";

export type ReviewCapability =
  | "base-branch-review"
  | "code-review"
  | "commit-review"
  | "cwd-selection"
  | "ephemeral-session"
  | "json-events"
  | "local-oss-provider"
  | "output-last-message"
  | "remote-openai-provider"
  | "uncommitted-review";

export type ReviewProviderFamily = "claude" | "codex";

export type ReviewProviderId = "claude-code" | "codex-cli";

export type ReviewProviderStatus = "placeholder" | "ready";

export type LocalOssProvider = "lmstudio" | "ollama";

export type ReviewTarget =
  | {
      kind: "base";
      baseBranch: string;
    }
  | {
      kind: "commit";
      commitSha: string;
    }
  | {
      kind: "uncommitted";
    };

export type ReviewResolutionRequest = {
  readonly dataClass: DataClass;
  readonly modelClass?: ModelClass;
  readonly preferredProviders?: readonly ReviewProviderId[];
  readonly requiredCapabilities?: readonly ReviewCapability[];
};

export type ReviewProviderRequest = ReviewResolutionRequest & {
  readonly configOverrides?: readonly string[];
  readonly cwd: string;
  readonly disableFeatures?: readonly string[];
  readonly enableFeatures?: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly ephemeral?: boolean;
  readonly localProvider?: LocalOssProvider;
  readonly model?: string;
  readonly outputLastMessagePath?: string;
  readonly prompt: string;
  readonly skipGitRepoCheck?: boolean;
  readonly target: ReviewTarget;
  readonly timeoutMs?: number;
  readonly title?: string;
};

export type ReviewProviderDescriptor = {
  readonly capabilities: readonly ReviewCapability[];
  readonly defaultModelClass: ModelClass;
  readonly displayName: string;
  readonly family: ReviewProviderFamily;
  readonly id: ReviewProviderId;
  readonly notes?: string;
  readonly status: ReviewProviderStatus;
  readonly supportedModelClasses: readonly ModelClass[];
};

export type CliInvocation = {
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly executable: string;
  readonly kind: "cli";
  readonly modelClass: ModelClass;
  readonly providerId: ReviewProviderId;
  readonly stdin?: string;
  readonly timeoutMs: number;
};

export type PlaceholderInvocation = {
  readonly expectedExecutable: string;
  readonly kind: "placeholder";
  readonly modelClass: ModelClass;
  readonly notes: string;
  readonly providerId: ReviewProviderId;
};

export type ReviewProviderInvocation = CliInvocation | PlaceholderInvocation;

export type ReviewProviderSelection = {
  readonly adapter: ReviewProviderAdapter;
  readonly descriptor: ReviewProviderDescriptor;
  readonly missingCapabilities: readonly ReviewCapability[];
  readonly modelClass: ModelClass;
};

export interface ReviewProviderAdapter<
  TInvocation extends ReviewProviderInvocation = ReviewProviderInvocation,
> {
  readonly descriptor: ReviewProviderDescriptor;
  buildInvocation(request: ReviewProviderRequest): TInvocation;
}
