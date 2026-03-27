import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPromptTemplate, loadRubricDefinition } from "./loaders";

describe("review-engine loaders", () => {
  it("loads prompt and rubric definitions from files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "review-engine-loaders-"));
    const promptPath = join(directory, "prompt.json");
    const rubricPath = join(directory, "rubric.json");

    await writeFile(
      promptPath,
      JSON.stringify({
        id: "testing-contracts",
        version: "1",
        system: "system",
        user: "user",
      }),
    );
    await writeFile(
      rubricPath,
      JSON.stringify({
        version: "1",
        name: "contracts",
        criteria: [
          {
            id: "contracts",
            title: "Contracts",
            description: "desc",
            weight: 3,
            required: true,
          },
        ],
      }),
    );

    await expect(
      loadPromptTemplate({ kind: "file", value: "prompt.json" }, directory),
    ).resolves.toEqual({
      id: "testing-contracts",
      version: "1",
      system: "system",
      user: "user",
    });
    await expect(
      loadRubricDefinition({ kind: "file", value: "rubric.json" }, directory),
    ).resolves.toEqual({
      version: "1",
      name: "contracts",
      criteria: [
        {
          id: "contracts",
          title: "Contracts",
          description: "desc",
          weight: 3,
          required: true,
        },
      ],
    });
  });

  it("rejects malformed rubric definitions", async () => {
    await expect(
      loadRubricDefinition(
        {
          kind: "inline",
          value: JSON.stringify({
            version: "1",
            name: "broken",
            criteria: [],
          }),
        },
        process.cwd(),
      ),
    ).rejects.toThrow("Rubric criteria must contain at least one entry.");
  });
});
