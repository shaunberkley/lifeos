import { AppError, createLogger, toErrorResponse } from "@lifeos/logging";
import { Hono } from "hono";
import type { AppVariables } from "../context";
import { getGitHubWebhookEnvironment } from "../github/config";
import { executeReviewJob } from "../github/executor";
import { createReviewOrchestrator } from "../github/orchestrator";
import {
  isSupportedPullRequestAction,
  mapGitHubPullRequestWebhookEvent,
  parseGitHubWebhookHeaders,
  parseGitHubWebhookRequest,
  verifyGitHubWebhookSignature,
} from "../github/webhook";

const fallbackLogger = createLogger({
  service: "lifeos-server",
  sink: () => {},
});

export const githubWebhooksRoute = new Hono<{ Variables: AppVariables }>().post(
  "/github",
  async (c) => {
    const logger = c.get("logger") ?? fallbackLogger;

    try {
      const environment = getGitHubWebhookEnvironment();
      const headers = parseGitHubWebhookHeaders(c.req.raw.headers);
      const rawBody = await c.req.text();

      if (!verifyGitHubWebhookSignature(rawBody, headers.signature256, environment.webhookSecret)) {
        throw new AppError({
          code: "policy_violation",
          message: "GitHub webhook signature verification failed.",
          status: 403,
          details: {
            header: "x-hub-signature-256",
            surface: "github-webhooks",
          },
        });
      }

      if (headers.event !== "pull_request") {
        logger.info("github webhook ignored", {
          data: {
            deliveryId: headers.deliveryId,
            event: headers.event,
          },
        });

        return c.json(
          {
            ok: true,
            accepted: false,
            event: headers.event,
            reason: "unsupported_event",
          },
          202,
        );
      }

      const { payload } = parseGitHubWebhookRequest({
        headers: c.req.raw.headers,
        rawBody,
        webhookSecret: environment.webhookSecret,
      });

      if (!isSupportedPullRequestAction(payload.action)) {
        logger.info("github pull request webhook ignored", {
          data: {
            action: payload.action,
            deliveryId: headers.deliveryId,
          },
        });

        return c.json(
          {
            ok: true,
            accepted: false,
            action: payload.action,
            reason: "unsupported_action",
          },
          202,
        );
      }

      const mappedEvent = mapGitHubPullRequestWebhookEvent({
        payload,
        deliveryId: headers.deliveryId,
        receivedAt: new Date().toISOString(),
        expectedRepository: environment.repository.fullName,
      });

      if (!mappedEvent) {
        throw new AppError({
          code: "validation_error",
          message: "GitHub pull request webhook could not be mapped.",
          status: 400,
          details: {
            action: payload.action,
            surface: "github-webhooks",
          },
        });
      }

      const orchestrator = createReviewOrchestrator();
      const reviewJob = orchestrator.enqueueGitHubPullRequestReview(mappedEvent);

      logger.info("github review job queued", {
        data: {
          deliveryId: reviewJob.deliveryId,
          eventType: reviewJob.eventType,
          pullRequestNumber: reviewJob.pullRequestNumber,
          reviewId: reviewJob.id,
        },
      });

      if (process.env.BOB_AUTO_RUN === "true") {
        queueMicrotask(() => {
          executeReviewJob(reviewJob.id).catch((error) => {
            logger.error("automatic GitHub review execution failed", {
              error,
              data: {
                reviewId: reviewJob.id,
              },
            });
          });
        });
      }

      return c.json(
        {
          accepted: true,
          deliveryId: reviewJob.deliveryId,
          eventType: reviewJob.eventType,
          ok: true,
          pullRequestNumber: reviewJob.pullRequestNumber,
          reviewId: reviewJob.id,
        },
        202,
      );
    } catch (error) {
      const logger = c.get("logger") ?? fallbackLogger;
      logger.error("github webhook intake failed", { error });
      return c.json(
        toErrorResponse(error, {
          correlationId: c.get("correlationId"),
        }),
        toRouteStatusCode(error),
      );
    }
  },
);

function toRouteStatusCode(error: unknown) {
  return error instanceof AppError ? (error.status as 400 | 403 | 404 | 500 | 501 | 503) : 500;
}
