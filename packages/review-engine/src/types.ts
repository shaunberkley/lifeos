export type ReviewDepth = "standard" | "deep";

export type ReviewSeverity = "critical" | "high" | "medium" | "low" | "info";

export type SpecialistKind =
  | "testing-contracts"
  | "runtime-semantics"
  | "security"
  | "determinism"
  | "general";

export type PromptSource = {
  kind: "inline" | "file";
  value: string;
};

export type RubricCriterion = {
  id: string;
  title: string;
  description: string;
  weight: number;
  required?: boolean;
};

export type RubricDefinition = {
  version: string;
  name: string;
  criteria: readonly RubricCriterion[];
};

export type PromptTemplate = {
  id: string;
  version: string;
  system: string;
  user: string;
};

export type PullRequestRef = {
  number: number;
  repo: string;
  baseRefName?: string;
  headRefName?: string;
  title?: string;
  url?: string;
};

export type ChangedFileSummary = {
  path: string;
  additions: number;
  deletions: number;
  patch?: string;
};

export type PullRequestContext = {
  pullRequest: PullRequestRef;
  body?: string;
  changedFiles: readonly ChangedFileSummary[];
  commits: readonly string[];
};

export type DiffManifest = {
  createdAt: string;
  repositoryRoot: string;
  pullRequest: PullRequestRef;
  files: readonly ChangedFileSummary[];
  commitShas: readonly string[];
  rawDiff: string;
};

export type ContextManifest = {
  createdAt: string;
  repositoryRoot: string;
  reviewDepth: ReviewDepth;
  specialists: readonly SpecialistKind[];
  rubric: Pick<RubricDefinition, "name" | "version">;
  prompt: Pick<PromptTemplate, "id" | "version">;
};

export type ReviewFinding = {
  severity: ReviewSeverity;
  title: string;
  rationale: string;
  suggestedFix: string;
  filePath?: string;
  line?: number;
  fileReferences?: readonly string[];
};

export type SpecialistPassDefinition = {
  id: string;
  kind: SpecialistKind;
  title: string;
  prompt: PromptTemplate;
};

export type SpecialistPassInput = {
  definition: SpecialistPassDefinition;
  diffManifest: DiffManifest;
  contextManifest: ContextManifest;
  rubric: RubricDefinition;
};

export type SpecialistPassResult = {
  passId: string;
  kind: SpecialistKind;
  model: string;
  durationMs: number;
  findings: readonly ReviewFinding[];
  notes?: string;
  rawOutput: string;
};

export type SynthesisSummary = {
  outcome: "approve" | "request_changes" | "comment";
  overallRisk: ReviewSeverity;
  headline: string;
  rationale: string;
};

export type SynthesisResult = {
  summary: SynthesisSummary;
  findings: readonly ReviewFinding[];
  coverage: {
    specialistsRun: readonly SpecialistKind[];
    totalFindings: number;
  };
};

export type ArtifactEntry = {
  path: string;
  sha256: string;
  bytes: number;
  kind: "text" | "json";
};

export type ArtifactManifest = {
  version: 1;
  createdAt: string;
  entries: readonly ArtifactEntry[];
};

export type ReviewArtifacts = {
  diffManifest: DiffManifest;
  contextManifest: ContextManifest;
  artifactManifest: ArtifactManifest;
};

export type ReviewEngineResult = {
  artifacts: ReviewArtifacts;
  specialistPasses: readonly SpecialistPassResult[];
  synthesis: SynthesisResult;
};
