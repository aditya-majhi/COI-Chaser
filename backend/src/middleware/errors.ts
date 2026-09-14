import type { ErrorRequestHandler } from "express";
import { logger } from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  _next
) => {
  logger.error(error, { method: request.method, path: request.path });
  const statusByName: Record<string, number> = {
    InvalidCaseTransitionError: 409,
    NotFoundError: 404,
    RequirementsNotAssignedError: 409,
    UnsupportedDocumentError: 415,
    InvalidCaseRequestError: 409,
    VendorContactRequiredError: 409,
    InvalidAgentActionError: 409,
    InvalidHumanReviewStateError: 409,
  };
  const isDuplicateSlug =
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "23505";
  const status = isDuplicateSlug
    ? 409
    : (statusByName[error instanceof Error ? error.name : ""] ?? 500);
  response.status(status).json({
    error: isDuplicateSlug
      ? "An organization with this slug already exists"
      : status === 500
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Request failed",
  });
};
