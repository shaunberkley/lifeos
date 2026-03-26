import { describe, expect, it, vi } from "vitest";
import { loadReviewerApiSnapshot } from "./reviewerApi";
import { createShellReviewerWorkspace, mergeLiveReviewerWorkspace } from "./reviewerWorkspace";

describe("reviewer workspace loading", () => {
  it("loads live provider and review data from the API", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/providers")) {
        return new Response(
          JSON.stringify({
            ok: true,
            providers: [
              {
                provider: "github",
                displayName: "GitHub",
                repository: "shaunberkley/lifeos",
                webhookConfigured: true,
                publishConfigured: true,
                webhookEndpoint: "/webhooks/github",
                reviewRoutes: {
                  list: "/reviews",
                  detailPattern: "/reviews/:reviewId",
                  publishPattern: "/reviews/:reviewId/publish",
                },
                capabilities: ["pull_request_webhooks", "queued_review_jobs"],
                requiredEnvironment: ["GITHUB_WEBHOOK_SECRET", "GITHUB_REPOSITORY", "GITHUB_TOKEN"],
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      if (url.endsWith("/reviews")) {
        return new Response(
          JSON.stringify({
            ok: true,
            reviews: [
              {
                id: "review-1",
                provider: "github",
                deliveryId: "delivery-1",
                repository: "shaunberkley/lifeos",
                pullRequestNumber: 17,
                pullRequestTitle: "Bob-on-Codex MVP",
                pullRequestUrl: "https://github.com/shaunberkley/lifeos/pull/17",
                headSha: "abc123",
                baseSha: "def456",
                action: "opened",
                draft: false,
                author: "shaunberkley",
                idempotencyKey: "delivery-1:shaunberkley/lifeos:17:abc123:opened",
                eventType: "github.pull_request.opened",
                status: "queued",
                createdAt: "2026-03-24T20:00:00.000Z",
                updatedAt: "2026-03-24T20:00:00.000Z",
                publication: {
                  inlineCommentUrls: [],
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const snapshot = await loadReviewerApiSnapshot(fetchMock as typeof fetch, "https://api.test");
    const workspace = mergeLiveReviewerWorkspace(createShellReviewerWorkspace(), snapshot);

    expect(snapshot.source).toBe("live");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(workspace.liveSource).toBe("live");
    expect(
      workspace.providerConnections.find((provider) => provider.id === "github"),
    ).toMatchObject({
      status: "connected",
      owner: "shaunberkley/lifeos",
    });
    expect(workspace.reviewRuns[0]).toMatchObject({
      id: "review-1",
      source: "GitHub API",
      title: "Bob-on-Codex MVP",
    });
    expect(workspace.overviewStats[0]).toMatchObject({
      value: "1",
    });
  });

  it("keeps the shell state when the API is unavailable", async () => {
    const shell = createShellReviewerWorkspace();
    const snapshot = {
      source: "fallback" as const,
      providers: [],
      providersLoaded: false,
      reviews: [],
      reviewsLoaded: false,
      errors: ["Missing reviewer API base URL."],
    };

    const workspace = mergeLiveReviewerWorkspace(shell, snapshot);

    expect(workspace.liveSource).toBe("fallback");
    expect(workspace.providerConnections).toEqual(shell.providerConnections);
    expect(workspace.reviewRuns).toEqual(shell.reviewRuns);
    expect(workspace.overviewStats).toEqual(shell.overviewStats);
    expect(workspace.loadErrors).toEqual(["Missing reviewer API base URL."]);
  });
});
