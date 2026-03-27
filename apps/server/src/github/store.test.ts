import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { decodeJwt } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthRuntime, resetAuthRuntimeForTests } from "../auth/runtime";
import { enqueueReviewJob, listReviewJobs, resetReviewStateForTests } from "./store";

async function withDurableEnvironment() {
  process.env.AUTH_ISSUER = "http://lifeos.test";
  process.env.CONVEX_APPLICATION_ID = "lifeos-dev";
  process.env.BETTER_AUTH_SECRET = "test-secret-for-lifeos-store";
  process.env.WEB_ORIGIN = "http://localhost:1337";
  process.env.AUTH_DATABASE_PATH = path.join(
    os.tmpdir(),
    `lifeos-auth-${crypto.randomUUID()}.sqlite`,
  );
  process.env.CONVEX_URL = "https://convex.example.test";
  await resetAuthRuntimeForTests();
  return process.env.AUTH_DATABASE_PATH;
}

describe("durable github review store", () => {
  afterEach(async () => {
    await resetReviewStateForTests();
    const databasePath = process.env.AUTH_DATABASE_PATH;
    await resetAuthRuntimeForTests();
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
    process.env.AUTH_ISSUER = undefined;
    process.env.CONVEX_APPLICATION_ID = undefined;
    process.env.BETTER_AUTH_SECRET = undefined;
    process.env.WEB_ORIGIN = undefined;
    process.env.AUTH_DATABASE_PATH = undefined;
    process.env.CONVEX_URL = undefined;
    vi.restoreAllMocks();
  });

  it("authenticates Convex requests with a Better Auth JWT and hydrates durable state", async () => {
    const databasePath = await withDurableEnvironment();
    await getAuthRuntime();
    const calls: Array<{ path: string; url: string }> = [];

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      const authorization = headers.get("authorization");

      expect(authorization).toMatch(/^Bearer\s.+/);
      if (!authorization) {
        throw new Error("Missing Authorization header for durable Convex request.");
      }

      const token = authorization.slice("Bearer ".length).trim();
      const payload = decodeJwt(token);
      expect(payload.sub).toBe("lifeos-reviewer-service");
      expect(payload.iss).toBe(process.env.AUTH_ISSUER);
      expect(payload.aud).toBe(process.env.CONVEX_APPLICATION_ID);

      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const pathName = body.path as string;
      calls.push({ path: pathName, url });

      if (url.endsWith("/api/query") && pathName === "review:listReviewJobs") {
        return new Response(JSON.stringify({ value: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/api/mutation") && pathName === "review:upsertGithubPullRequestReviewJob") {
        return new Response(
          JSON.stringify({
            value: {
              reviewId: "reviewJobs:durable-1",
              runId: "reviewRuns:durable-1",
              created: true,
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      if (url.endsWith("/api/mutation") && pathName === "review:resetReviewStateForTests") {
        return new Response(JSON.stringify({ value: null }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/api/query") && pathName === "review:getReviewJob") {
        return new Response(
          JSON.stringify({
            value: {
              id: "reviewJobs:durable-1",
              provider: "github",
              deliveryId: "delivery-durable-1",
              repository: "shaunberkley/lifeos",
              pullRequestNumber: 151,
              pullRequestTitle: "LifeOS Reviewer foundation",
              pullRequestUrl: "https://github.com/shaunberkley/lifeos/pull/151",
              headSha: "head-durable-1",
              baseSha: "base-durable-1",
              action: "opened",
              draft: false,
              author: "shaunberkley",
              idempotencyKey: "delivery-durable-1:shaunberkley/lifeos:151:head-durable-1:opened",
              eventType: "github.pull_request.opened",
              status: "queued",
              createdAt: "2026-03-24T20:00:00.000Z",
              updatedAt: "2026-03-24T20:00:00.000Z",
              publication: {
                inlineCommentUrls: [],
              },
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      throw new Error(`Unexpected durable Convex request: ${url} ${pathName}`);
    }) as typeof fetch);

    const jobs = await listReviewJobs();
    expect(jobs).toEqual([]);

    const queued = await enqueueReviewJob({
      provider: "github",
      deliveryId: "delivery-durable-1",
      repository: "shaunberkley/lifeos",
      pullRequestNumber: 151,
      pullRequestTitle: "LifeOS Reviewer foundation",
      pullRequestUrl: "https://github.com/shaunberkley/lifeos/pull/151",
      headSha: "head-durable-1",
      baseSha: "base-durable-1",
      action: "opened",
      draft: false,
      author: "shaunberkley",
      idempotencyKey: "delivery-durable-1:shaunberkley/lifeos:151:head-durable-1:opened",
      eventType: "github.pull_request.opened",
    });

    expect(queued).toMatchObject({
      id: "reviewJobs:durable-1",
      status: "queued",
      publication: {
        inlineCommentUrls: [],
      },
    });

    const hydratedJobs = await listReviewJobs();
    expect(hydratedJobs).toHaveLength(1);
    expect(hydratedJobs[0]).toMatchObject({
      id: "reviewJobs:durable-1",
      status: "queued",
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(calls).toEqual([
      { path: "review:listReviewJobs", url: "https://convex.example.test/api/query" },
      {
        path: "review:upsertGithubPullRequestReviewJob",
        url: "https://convex.example.test/api/mutation",
      },
      { path: "review:getReviewJob", url: "https://convex.example.test/api/query" },
    ]);

    await resetAuthRuntimeForTests();
    if (databasePath) {
      await fs.rm(databasePath, { force: true });
    }
  });
});
