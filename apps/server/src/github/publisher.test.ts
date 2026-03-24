import { describe, expect, it, vi } from "vitest";
import { buildReviewSummaryBody, createGitHubPublishService } from "./publisher";

describe("GitHub publish service", () => {
  it("publishes inline and summary comments through the GitHub API", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/pulls/17/comments")) {
        return new Response(JSON.stringify({ html_url: `${url}/inline` }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.includes("/issues/17/comments")) {
        return new Response(JSON.stringify({ html_url: `${url}/summary` }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ html_url: `${url}/fallback` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const service = createGitHubPublishService({
      token: "github-token",
      repository: {
        owner: "shaunberkley",
        name: "lifeos",
        fullName: "shaunberkley/lifeos",
      },
      apiUrl: "https://api.github.com",
      fetch: fetchMock as typeof fetch,
    });

    const job = {
      id: "review-1",
      provider: "github" as const,
      deliveryId: "delivery-1",
      repository: "shaunberkley/lifeos",
      pullRequestNumber: 17,
      pullRequestTitle: "Improve LifeOS Reviewer MVP",
      pullRequestUrl: "https://github.com/shaunberkley/lifeos/pull/17",
      headSha: "abc123",
      baseSha: "def456",
      action: "opened" as const,
      draft: false,
      author: "shaunberkley",
      idempotencyKey: "delivery-1:shaunberkley/lifeos:17:abc123:opened",
      eventType: "github.pull_request.opened" as const,
      status: "queued" as const,
      createdAt: "2026-03-24T20:00:00.000Z",
      updatedAt: "2026-03-24T20:00:00.000Z",
      publication: {
        inlineCommentUrls: [],
      },
    };

    const result = await service.publishReview(job, {
      summaryComment: {
        body: "Summary",
      },
      inlineComments: [
        {
          path: "apps/server/src/app.ts",
          line: 12,
          side: "RIGHT",
          body: "Please split the route mount.",
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://api.github.com/repos/shaunberkley/lifeos/pulls/17/comments",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "https://api.github.com/repos/shaunberkley/lifeos/issues/17/comments",
    );
    expect(result).toEqual({
      inlineCommentUrls: [
        "https://api.github.com/repos/shaunberkley/lifeos/pulls/17/comments/inline",
      ],
      summaryCommentUrl:
        "https://api.github.com/repos/shaunberkley/lifeos/issues/17/comments/summary",
    });
  });

  it("builds a concise review summary", () => {
    const summary = buildReviewSummaryBody({
      id: "review-1",
      provider: "github",
      deliveryId: "delivery-1",
      repository: "shaunberkley/lifeos",
      pullRequestNumber: 17,
      pullRequestTitle: "Improve LifeOS Reviewer MVP",
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
    });

    expect(summary).toContain("LifeOS Reviewer review queued");
    expect(summary).toContain("Pull request: #17");
  });
});
