import type {
  PromptTemplate,
  ReviewDepth,
  RubricDefinition,
  SpecialistPassDefinition,
} from "./types";

export const defaultPromptTemplate: PromptTemplate = {
  id: "lifeos-reviewer-codex-mvp",
  version: "1",
  system: "You are a deterministic pull request review specialist.",
  user: "Review the pull request using the supplied rubric, manifests, and changed-file context.",
};

export const defaultRubricDefinition: RubricDefinition = {
  version: "1",
  name: "lifeos-reviewer-codex-mvp",
  criteria: [
    {
      id: "contracts",
      title: "Contracts",
      description: "Detect contract mismatches and missing compatibility proof.",
      weight: 3,
      required: true,
    },
    {
      id: "determinism",
      title: "Determinism",
      description: "Detect flaky, weak, or order-dependent behavior.",
      weight: 3,
      required: true,
    },
    {
      id: "runtime",
      title: "Runtime",
      description: "Check initialization semantics and failure recovery.",
      weight: 2,
      required: true,
    },
  ],
};

export function buildSpecialists(
  depth: ReviewDepth,
  prompt: PromptTemplate = defaultPromptTemplate,
): readonly SpecialistPassDefinition[] {
  const specialists: SpecialistPassDefinition[] = [
    {
      id: "testing-contracts",
      kind: "testing-contracts",
      title: "Review from the testing/contracts perspective.",
      prompt,
    },
    {
      id: "runtime-semantics",
      kind: "runtime-semantics",
      title: "Review runtime initialization semantics and failure recovery.",
      prompt,
    },
  ];

  if (depth === "deep") {
    specialists.push(
      {
        id: "determinism",
        kind: "determinism",
        title: "Review deterministic behavior, flake risk, and contract stability.",
        prompt,
      },
      {
        id: "security",
        kind: "security",
        title: "Review security-sensitive contract and initialization edges.",
        prompt,
      },
    );
  }

  return specialists;
}
