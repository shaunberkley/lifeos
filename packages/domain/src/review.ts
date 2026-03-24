import type { Brand, SourceEventId, WorkspaceId } from "./primitives";

export type ReviewProviderId = Brand<string, "ReviewProviderId">;
export type ReviewerIdentityId = Brand<string, "ReviewerIdentityId">;
export type ReviewPolicyId = Brand<string, "ReviewPolicyId">;
export type ReviewJobId = Brand<string, "ReviewJobId">;
export type ReviewRunId = Brand<string, "ReviewRunId">;
export type ReviewFindingId = Brand<string, "ReviewFindingId">;
export type ReviewArtifactId = Brand<string, "ReviewArtifactId">;
export type ReviewCommentId = Brand<string, "ReviewCommentId">;

export type ReviewProviderKind = "codex" | "claude" | "cursor" | "github" | "manual";
export type ReviewProviderStatus = "active" | "disabled" | "error";

export type ReviewerIdentityKind = "human" | "agent" | "system";
export type ReviewerIdentityStatus = "active" | "disabled" | "revoked";

export type ReviewPolicyScopeKind = "workspace" | "provider" | "job";
export type ReviewPolicyMode = "advisory" | "required";

export type ReviewTargetKind =
  | "pull_request"
  | "commit"
  | "branch"
  | "patch"
  | "artifact"
  | "prompt";

export type ReviewJobStatus =
  | "queued"
  | "running"
  | "blocked"
  | "completed"
  | "failed"
  | "canceled";
export type ReviewRunStatus = "queued" | "running" | "passed" | "failed" | "canceled";

export type ReviewFindingSeverity = "info" | "low" | "medium" | "high" | "critical";
export type ReviewFindingStatus = "open" | "acknowledged" | "resolved" | "dismissed";

export type ReviewArtifactKind =
  | "diff"
  | "patch"
  | "prompt"
  | "log"
  | "trace"
  | "screenshot"
  | "attachment";
export type ReviewCommentVisibility = "internal" | "public";

export type ReviewProviderRecord = {
  workspaceId: WorkspaceId;
  key: string;
  name: string;
  kind: ReviewProviderKind;
  status: ReviewProviderStatus;
  baseUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewerIdentityRecord = {
  workspaceId: WorkspaceId;
  reviewProviderId: ReviewProviderId;
  externalId: string;
  displayName: string;
  handle: string;
  kind: ReviewerIdentityKind;
  status: ReviewerIdentityStatus;
  email?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewPolicyRecord = {
  workspaceId: WorkspaceId;
  key: string;
  name: string;
  scopeKind: ReviewPolicyScopeKind;
  mode: ReviewPolicyMode;
  targetKind: ReviewTargetKind;
  reviewProviderId?: ReviewProviderId;
  minBlockingSeverity?: ReviewFindingSeverity;
  requiresHumanApproval: boolean;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
};

export type ReviewJobRecord = {
  workspaceId: WorkspaceId;
  reviewPolicyId: ReviewPolicyId;
  reviewProviderId: ReviewProviderId;
  sourceEventId?: SourceEventId;
  requestedByReviewerIdentityId?: ReviewerIdentityId;
  targetKind: ReviewTargetKind;
  targetRef: string;
  title: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: ReviewJobStatus;
  createdAt: string;
  updatedAt: string;
};

export type ReviewRunRecord = {
  workspaceId: WorkspaceId;
  reviewJobId: ReviewJobId;
  reviewProviderId: ReviewProviderId;
  reviewerIdentityId: ReviewerIdentityId;
  attemptNumber: number;
  runnerVersion?: string;
  status: ReviewRunStatus;
  startedAt: string;
  finishedAt?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewFindingRecord = {
  workspaceId: WorkspaceId;
  reviewJobId: ReviewJobId;
  reviewRunId: ReviewRunId;
  title: string;
  detail: string;
  severity: ReviewFindingSeverity;
  status: ReviewFindingStatus;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  recommendation?: string;
  fingerprint?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewArtifactRecord = {
  workspaceId: WorkspaceId;
  reviewJobId: ReviewJobId;
  reviewRunId: ReviewRunId;
  kind: ReviewArtifactKind;
  name: string;
  storageKey: string;
  mimeType: string;
  contentHash: string;
  sizeBytes: number;
  createdAt: string;
};

export type ReviewCommentRecord = {
  workspaceId: WorkspaceId;
  reviewJobId: ReviewJobId;
  reviewRunId: ReviewRunId;
  reviewFindingId?: ReviewFindingId;
  replyToCommentId?: ReviewCommentId;
  authorReviewerIdentityId?: ReviewerIdentityId;
  body: string;
  visibility: ReviewCommentVisibility;
  createdAt: string;
  updatedAt: string;
};

const TERMINAL_REVIEW_JOB_STATUSES: readonly ReviewJobStatus[] = [
  "completed",
  "failed",
  "canceled",
];
const TERMINAL_REVIEW_RUN_STATUSES: readonly ReviewRunStatus[] = ["passed", "failed", "canceled"];

export function isTerminalReviewJobStatus(status: ReviewJobStatus): boolean {
  return TERMINAL_REVIEW_JOB_STATUSES.includes(status);
}

export function isTerminalReviewRunStatus(status: ReviewRunStatus): boolean {
  return TERMINAL_REVIEW_RUN_STATUSES.includes(status);
}
