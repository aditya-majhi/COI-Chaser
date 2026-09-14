import type { Request, Response } from "express";
import { uuidSchema } from "../validators/domain.js";
import { requestCase } from "../services/request-service.js";

export async function requestCaseController(
  request: Request,
  response: Response
) {
  const caseId = uuidSchema.parse(request.params.id);
  const result = await requestCase(request.organizationId as string, caseId);
  if (!result) {
    response.status(404).json({ error: "Case not found" });
    return;
  }
  response.status(202).json(result);
}
