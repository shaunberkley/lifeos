import { afterEach, describe, expect, it } from "vitest";
import { providersRoute } from "./providers";

describe("provider routes", () => {
  afterEach(() => {
    process.env.GITHUB_WEBHOOK_SECRET = undefined;
    process.env.GITHUB_REPOSITORY = undefined;
    process.env.GITHUB_TOKEN = undefined;
  });

  it("returns the GitHub provider catalog", async () => {
    const response = await providersRoute.request("http://lifeos.test/", {
      method: "GET",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      providers: [
        expect.objectContaining({
          provider: "github",
          capabilities: [
            "pull_request_webhooks",
            "queued_review_jobs",
            "inline_review_comments",
            "summary_review_comments",
          ],
        }),
        expect.objectContaining({
          provider: "reviewer",
          id: "codex-cli",
          family: "codex",
          status: "ready",
        }),
        expect.objectContaining({
          provider: "reviewer",
          id: "claude-code",
          family: "claude",
          status: "placeholder",
        }),
      ],
    });
  });

  it("returns a GitHub provider detail record with configuration flags", async () => {
    process.env.GITHUB_WEBHOOK_SECRET = "github-webhook-secret";
    process.env.GITHUB_REPOSITORY = "shaunberkley/lifeos";
    process.env.GITHUB_TOKEN = "github-token";

    const response = await providersRoute.request("http://lifeos.test/github", {
      method: "GET",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      provider: {
        provider: "github",
        repository: "shaunberkley/lifeos",
        webhookConfigured: true,
        publishConfigured: true,
      },
    });
  });
});
