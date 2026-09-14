import type { Response } from "express";
import type { ZodError } from "zod";

export function validationError(response: Response, error: ZodError) {
  response.status(400).json({
    error: "Validation failed",
    details: error.issues.map(issue => ({
      path: issue.path,
      message: issue.message,
    })),
  });
}
