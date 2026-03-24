import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { PromptSource, PromptTemplate, RubricDefinition } from "./types";

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  return value;
}

async function resolveSource(source: PromptSource, repositoryRoot: string): Promise<string> {
  if (source.kind === "inline") {
    return source.value;
  }

  return readFile(resolve(repositoryRoot, source.value), "utf8");
}

export async function loadPromptTemplate(
  source: PromptSource,
  repositoryRoot: string,
): Promise<PromptTemplate> {
  const raw = await resolveSource(source, repositoryRoot);
  const parsed = asRecord(JSON.parse(raw), "Prompt template");

  return {
    id: asString(parsed.id, "Prompt template id"),
    version: asString(parsed.version, "Prompt template version"),
    system: asString(parsed.system, "Prompt template system"),
    user: asString(parsed.user, "Prompt template user"),
  };
}

export async function loadRubricDefinition(
  source: PromptSource,
  repositoryRoot: string,
): Promise<RubricDefinition> {
  const raw = await resolveSource(source, repositoryRoot);
  const parsed = asRecord(JSON.parse(raw), "Rubric definition");
  const criteria = parsed.criteria;

  if (!Array.isArray(criteria) || criteria.length === 0) {
    throw new Error("Rubric criteria must contain at least one entry.");
  }

  return {
    version: asString(parsed.version, "Rubric version"),
    name: asString(parsed.name, "Rubric name"),
    criteria: criteria.map((criterion, index) => {
      const record = asRecord(criterion, `Rubric criterion at index ${index}`);
      const normalized = {
        id: asString(record.id, `Rubric criterion ${index} id`),
        title: asString(record.title, `Rubric criterion ${index} title`),
        description: asString(record.description, `Rubric criterion ${index} description`),
        weight: asNumber(record.weight, `Rubric criterion ${index} weight`),
      };

      if (record.required !== undefined) {
        return {
          ...normalized,
          required: Boolean(record.required),
        };
      }

      return normalized;
    }),
  };
}
