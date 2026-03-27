import { assertModelAllowed, resolveRequestedModelClass } from "../policy";
import type {
  CliInvocation,
  ReviewProviderAdapter,
  ReviewProviderDescriptor,
  ReviewProviderRequest,
} from "../types";

const CODEX_DESCRIPTOR = {
  capabilities: [
    "base-branch-review",
    "code-review",
    "commit-review",
    "cwd-selection",
    "ephemeral-session",
    "json-events",
    "local-oss-provider",
    "output-last-message",
    "remote-openai-provider",
    "uncommitted-review",
  ],
  defaultModelClass: "remote",
  displayName: "Codex CLI",
  family: "codex",
  id: "codex-cli",
  notes: "Uses the local codex CLI via `codex exec review` with stdin-delivered instructions.",
  status: "ready",
  supportedModelClasses: ["local", "remote"],
} satisfies ReviewProviderDescriptor;

function pushRepeatableFlags(
  args: string[],
  flag: "--disable" | "--enable",
  values?: readonly string[],
) {
  for (const value of values ?? []) {
    args.push(flag, value);
  }
}

function pushRepeatableOverrides(args: string[], values?: readonly string[]) {
  for (const value of values ?? []) {
    args.push("-c", value);
  }
}

function pushReviewTarget(args: string[], request: ReviewProviderRequest) {
  switch (request.target.kind) {
    case "base":
      args.push("--base", request.target.baseBranch);
      break;
    case "commit":
      args.push("--commit", request.target.commitSha);
      break;
    case "uncommitted":
      args.push("--uncommitted");
      break;
  }
}

export type CodexCliReviewAdapter = ReviewProviderAdapter<CliInvocation>;

export function createCodexReviewAdapter(): CodexCliReviewAdapter {
  return {
    descriptor: CODEX_DESCRIPTOR,
    buildInvocation(request) {
      const modelClass = resolveRequestedModelClass(request, CODEX_DESCRIPTOR);
      assertModelAllowed(request.dataClass, modelClass);

      const args: string[] = ["-C", request.cwd];
      pushRepeatableOverrides(args, request.configOverrides);
      pushRepeatableFlags(args, "--enable", request.enableFeatures);
      pushRepeatableFlags(args, "--disable", request.disableFeatures);

      args.push("exec", "review");

      if (request.ephemeral ?? true) {
        args.push("--ephemeral");
      }

      if (request.skipGitRepoCheck) {
        args.push("--skip-git-repo-check");
      }

      args.push("--json");

      if (modelClass === "local") {
        args.push("--oss");
        if (request.localProvider) {
          args.push("--local-provider", request.localProvider);
        }
      }

      if (request.model) {
        args.push("-m", request.model);
      }

      pushReviewTarget(args, request);

      if (request.title) {
        args.push("--title", request.title);
      }

      if (request.outputLastMessagePath) {
        args.push("-o", request.outputLastMessagePath);
      }

      args.push("-");

      return {
        args,
        cwd: request.cwd,
        env: request.env ?? {},
        executable: "codex",
        kind: "cli",
        modelClass,
        providerId: CODEX_DESCRIPTOR.id,
        stdin: request.prompt,
        timeoutMs: request.timeoutMs ?? 300_000,
      };
    },
  };
}
