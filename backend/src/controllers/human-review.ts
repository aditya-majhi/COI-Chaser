import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import { applyHumanDecision } from "../services/human-review-service.js";
import { validationError } from "../utils/http.js";

const body = z.object({
  decision: z.enum(["REQUEST_MORE_EVIDENCE", "REJECT", "APPROVE_EXCEPTION"]),
  note: z.string().trim().max(2000).optional(),
});

export async function humanReviewController(
  request: Request,
  response: Response
) {
  try {
    const caseId = z.string().uuid().parse(request.params.id);
    const input = body.parse(request.body);
    const result = await applyHumanDecision(
      request.organizationId as string,
      caseId,
      request.user!.id,
      input.decision,
      input.note
    );
    if (!result) {
      response.status(404).json({ error: "Case not found" });
      return;
    }
    response.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(response, error);
      return;
    }
    throw error;
  }
}
