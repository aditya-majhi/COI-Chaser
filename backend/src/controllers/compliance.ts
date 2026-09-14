import type { Request, Response } from "express";
import { ZodError, z } from "zod";
import { caseBelongsToOrganization } from "../repositories/cases.js";
import { saveComplianceResult } from "../repositories/compliance.js";
import { evaluateCompliance } from "../services/compliance.js";
import { validationError } from "../utils/http.js";
import type {
  ExtractedInsurance,
  InsuranceRequirements,
} from "../types/insurance.js";
import { uuidSchema } from "../validators/domain.js";

const complianceInput = z.object({
  requirements: z.record(z.string(), z.unknown()),
  extracted: z.record(z.string(), z.unknown()),
  work_start_date: z.string().date(),
  document_id: uuidSchema.optional(),
});

export async function recheckComplianceController(
  request: Request,
  response: Response
) {
  try {
    const caseId = uuidSchema.parse(request.params.id);
    if (
      !(await caseBelongsToOrganization(
        request.organizationId as string,
        caseId
      ))
    ) {
      response.status(404).json({ error: "Case not found" });
      return;
    }
    const input = complianceInput.parse(request.body);
    const result = evaluateCompliance(
      input.requirements as InsuranceRequirements,
      input.extracted as ExtractedInsurance,
      input.work_start_date
    );
    response.json(
      await saveComplianceResult(caseId, result, input.document_id)
    );
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(response, error);
      return;
    }
    throw error;
  }
}
