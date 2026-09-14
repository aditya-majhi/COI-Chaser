import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import { resolveCase } from "../services/agent-service.js";
import { validationError } from "../utils/http.js";

const input = z.object({
  deficiencies: z.array(z.string().min(1)).min(1).max(20),
});

export async function resolveCaseController(
  request: Request,
  response: Response
) {
  try {
    const caseId = z.string().uuid().parse(request.params.id);
    const result = await resolveCase(
      request.organizationId as string,
      caseId,
      input.parse(request.body).deficiencies
    );
    if (!result) {
      response.status(404).json({ error: "Case not found" });
      return;
    }
    response.status(202).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(response, error);
      return;
    }
    throw error;
  }
}
