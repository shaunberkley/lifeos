import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type {
  ReviewFinding,
  SpecialistPassInput,
  SpecialistPassResult,
  SynthesisResult,
  SynthesisSummary,
} from "./types";

const execFileAsync = promisify(execFile);

type CodexRunner = {
  runSpecialist(input: SpecialistPassInput): Promise<SpecialistPassResult>;
};

type CodexJsonOutput = {
  findings?: ReviewFinding[];
  notes?: string;
  model?: string;
};

const OUTPUT_SCHEMA = {
  additionalProperties: false,
  properties: {
    findings: {
      default: [],
      items: {
        additionalProperties: false,
        properties: {
          filePath: {
            type: "string",
          },
          fileReferences: {
            items: {
              type: "string",
            },
            type: "array",
          },
          line: {
            minimum: 1,
            type: "integer",
          },
          rationale: {
            type: "string",
          },
          severity: {
            enum: ["critical", "high", "medium", "low", "info"],
          },
          suggestedFix: {
            type: "string",
          },
          title: {
            type: "string",
          },
        },
        required: ["severity", "title", "rationale", "suggestedFix"],
        type: "object",
      },
      type: "array",
    },
    model: {
      type: "string",
    },
    notes: {
      type: "string",
    },
  },
  required: ["findings"],
  type: "object",
} as const;

function buildPrompt(input: SpecialistPassInput): string {
  return JSON.stringify(
    {
      task: input.definition.title,
      instructions: {
        system: input.definition.prompt.system,
        user: input.definition.prompt.user,
      },
      rubric: input.rubric,
      diffManifest: input.diffManifest,
      contextManifest: input.contextManifest,
      outputContract:
        "Return only JSON matching the schema. Findings must be concrete, findings-first, and cite file references when possible.",
    },
    null,
    2,
  );
}

function parseRunnerOutput(output: string): CodexJsonOutput {
  return JSON.parse(output) as CodexJsonOutput;
}

export function summarizePasses(passes: readonly SpecialistPassResult[]): SynthesisResult {
  const findings = passes.flatMap((pass) => pass.findings);
  const highestSeverity: SynthesisSummary["overallRisk"] =
    findings.find((finding) => finding.severity === "critical")?.severity ??
    findings.find((finding) => finding.severity === "high")?.severity ??
    findings.find((finding) => finding.severity === "medium")?.severity ??
    findings.find((finding) => finding.severity === "low")?.severity ??
    "info";

  return {
    summary: {
      outcome: findings.some(
        (finding) => finding.severity === "critical" || finding.severity === "high",
      )
        ? "request_changes"
        : findings.length > 0
          ? "comment"
          : "approve",
      overallRisk: highestSeverity,
      headline:
        findings.length === 0
          ? "No material findings."
          : `${findings.length} finding${findings.length === 1 ? "" : "s"} across ${passes.length} specialist passes.`,
      rationale:
        findings.length === 0
          ? "All specialist passes completed without reporting review findings."
          : "Specialist findings were merged deterministically into a single review result.",
    },
    findings,
    coverage: {
      specialistsRun: passes.map((pass) => pass.kind),
      totalFindings: findings.length,
    },
  };
}

export function createCodexRunner(binary = "codex"): CodexRunner {
  return {
    async runSpecialist(input) {
      const startedAt = Date.now();
      const scratchDirectory = await mkdtemp(join(tmpdir(), "lifeos-pr-review-"));
      const schemaPath = join(scratchDirectory, "output-schema.json");
      const outputPath = join(scratchDirectory, "output.json");

      try {
        await writeFile(schemaPath, JSON.stringify(OUTPUT_SCHEMA, null, 2));
        await execFileAsync(
          binary,
          [
            "exec",
            "--skip-git-repo-check",
            "--output-schema",
            schemaPath,
            "-o",
            outputPath,
            buildPrompt(input),
          ],
          {
            cwd: input.diffManifest.repositoryRoot,
            maxBuffer: 32 * 1024 * 1024,
          },
        );

        const output = await readFile(outputPath, "utf8");
        const parsed = parseRunnerOutput(output);

        const result: SpecialistPassResult = {
          passId: input.definition.id,
          kind: input.definition.kind,
          model: parsed.model ?? "codex",
          durationMs: Date.now() - startedAt,
          findings: parsed.findings ?? [],
          rawOutput: output,
        };

        if (parsed.notes !== undefined) {
          result.notes = parsed.notes;
        }

        return result;
      } finally {
        await rm(scratchDirectory, { force: true, recursive: true });
      }
    },
  };
}

export type { CodexRunner };
