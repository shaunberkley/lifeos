import { AppError, createLogger, toErrorResponse } from "@lifeos/logging";
import { Hono } from "hono";
import type { AppVariables } from "../context";
import { executeReviewJob } from "../github/executor";
import { createReviewOrchestrator } from "../github/orchestrator";
import type { GitHubInlineCommentDraft, GitHubPublishReviewRequest } from "../github/types";

const fallbackLogger = createLogger({
  service: "lifeos-server",
  sink: () => {},
});

function toRouteStatusCode(error: unknown) {
  return error instanceof AppError ? (error.status as 400 | 403 | 404 | 500 | 501 | 503) : 500;
}

function createValidationError(message: string, details: Record<string, unknown>) {
  return new AppError({
    code: "validation_error",
    message,
    status: 400,
    details,
  });
}

function createNotFoundError(message: string, details: Record<string, unknown>) {
  return new AppError({
    code: "not_found",
    message,
    status: 404,
    details,
  });
}

function parseInlineComment(input: unknown, index: number): GitHubInlineCommentDraft {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw createValidationError("Inline review comments must be objects.", { index });
  }

  const comment = input as Record<string, unknown>;
  const path = comment.path;
  const line = comment.line;
  const body = comment.body;
  const side = comment.side ?? "RIGHT";

  if (typeof path !== "string" || path.trim() === "") {
    throw createValidationError("Inline review comments must include a file path.", { index });
  }

  if (typeof line !== "number" || !Number.isInteger(line) || line < 1) {
    throw createValidationError("Inline review comments must include a positive line number.", {
      index,
      path,
    });
  }

  if (typeof body !== "string" || body.trim() === "") {
    throw createValidationError("Inline review comments must include a body.", { index, path });
  }

  if (side !== "LEFT" && side !== "RIGHT") {
    throw createValidationError("Inline review comment side must be LEFT or RIGHT.", {
      index,
      path,
      side,
    });
  }

  return {
    path,
    line,
    side,
    body,
  };
}

function parsePublishRequest(input: unknown): GitHubPublishReviewRequest {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw createValidationError("Review publish request must be an object.", {
      surface: "reviews",
    });
  }

  const payload = input as Record<string, unknown>;
  const summaryComment = payload.summaryComment;
  const inlineComments = payload.inlineComments ?? [];

  if (
    typeof summaryComment !== "object" ||
    summaryComment === null ||
    Array.isArray(summaryComment)
  ) {
    throw createValidationError("Review publish request must include a summary comment.", {
      surface: "reviews",
    });
  }

  const summaryBody = (summaryComment as Record<string, unknown>).body;
  if (typeof summaryBody !== "string" || summaryBody.trim() === "") {
    throw createValidationError("Review summary comment body cannot be empty.", {
      surface: "reviews",
    });
  }

  if (!Array.isArray(inlineComments)) {
    throw createValidationError("Inline review comments must be an array.", {
      surface: "reviews",
    });
  }

  return {
    summaryComment: {
      body: summaryBody,
    },
    inlineComments: inlineComments.map((comment, index) => parseInlineComment(comment, index)),
  };
}

export const reviewsRoute = new Hono<{ Variables: AppVariables }>()
  .get("/", (c) => {
    const logger = c.get("logger") ?? fallbackLogger;

    try {
      const orchestrator = createReviewOrchestrator();
      return c.json({
        ok: true,
        reviews: orchestrator.listReviewJobs(),
      });
    } catch (error) {
      logger.error("review list request failed", { error });
      return c.json(
        toErrorResponse(error, {
          correlationId: c.get("correlationId"),
        }),
        toRouteStatusCode(error),
      );
    }
  })
  .get("/:reviewId", (c) => {
    const logger = c.get("logger") ?? fallbackLogger;

    try {
      const orchestrator = createReviewOrchestrator();
      const review = orchestrator.getReviewJob(c.req.param("reviewId"));

      if (!review) {
        throw createNotFoundError("Review job not found.", {
          reviewId: c.req.param("reviewId"),
        });
      }

      return c.json({
        ok: true,
        review,
      });
    } catch (error) {
      logger.error("review detail request failed", { error });
      return c.json(
        toErrorResponse(error, {
          correlationId: c.get("correlationId"),
        }),
        toRouteStatusCode(error),
      );
    }
  })
  .post("/:reviewId/publish", async (c) => {
    const logger = c.get("logger") ?? fallbackLogger;

    try {
      const orchestrator = createReviewOrchestrator();
      const reviewId = c.req.param("reviewId");
      let body: unknown;
      try {
        body = await c.req.json();
      } catch (error) {
        throw createValidationError("Review publish request must be valid JSON.", {
          cause: error instanceof Error ? error.message : String(error),
        });
      }

      const request = parsePublishRequest(body);
      const publication = await orchestrator.publishReviewJob(reviewId, request);
      const review = orchestrator.getReviewJob(reviewId);

      return c.json({
        ok: true,
        publication,
        review,
      });
    } catch (error) {
      logger.error("review publish request failed", { error });
      return c.json(
        toErrorResponse(error, {
          correlationId: c.get("correlationId"),
        }),
        toRouteStatusCode(error),
      );
    }
  })
  .post("/:reviewId/run", async (c) => {
    const logger = c.get("logger") ?? fallbackLogger;

    try {
      const reviewId = c.req.param("reviewId");
      const result = await executeReviewJob(reviewId);
      const orchestrator = createReviewOrchestrator();
      const review = orchestrator.getReviewJob(reviewId);

      return c.json({
        ok: true,
        review,
        result,
      });
    } catch (error) {
      logger.error("review execution request failed", { error });
      return c.json(
        toErrorResponse(error, {
          correlationId: c.get("correlationId"),
        }),
        toRouteStatusCode(error),
      );
    }
  });
