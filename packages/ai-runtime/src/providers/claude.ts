import { assertModelAllowed, resolveRequestedModelClass } from "../policy";
import type {
  PlaceholderInvocation,
  ReviewProviderAdapter,
  ReviewProviderDescriptor,
} from "../types";

const CLAUDE_DESCRIPTOR = {
  capabilities: [
    "base-branch-review",
    "code-review",
    "commit-review",
    "cwd-selection",
    "output-last-message",
    "uncommitted-review",
  ],
  defaultModelClass: "remote",
  displayName: "Claude Code",
  family: "claude",
  id: "claude-code",
  notes:
    "Placeholder adapter only. Invocation wiring is intentionally deferred until Claude contracts are finalized.",
  status: "placeholder",
  supportedModelClasses: ["remote"],
} satisfies ReviewProviderDescriptor;

export type ClaudePlaceholderAdapter = ReviewProviderAdapter<PlaceholderInvocation>;

export function createClaudePlaceholderAdapter(): ClaudePlaceholderAdapter {
  return {
    descriptor: CLAUDE_DESCRIPTOR,
    buildInvocation(request) {
      const modelClass = resolveRequestedModelClass(request, CLAUDE_DESCRIPTOR);
      assertModelAllowed(request.dataClass, modelClass);

      return {
        expectedExecutable: "claude",
        kind: "placeholder",
        modelClass,
        notes:
          "Claude-compatible review support is intentionally scaffolded only. Add the real CLI contract before use.",
        providerId: CLAUDE_DESCRIPTOR.id,
      };
    },
  };
}
