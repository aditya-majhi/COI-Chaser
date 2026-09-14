import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  createCaseSchema,
  transitionCaseSchema,
  uuidSchema,
} from "../validators/domain.js";
import { validationError } from "../utils/http.js";
import {
  createOrganizationCase,
  getOrganizationCase,
  getOrganizationCaseEvents,
  transitionOrganizationCase,
} from "../services/case-service.js";

function organizationId(request: Request) {
  return request.organizationId as string;
}

export async function createCaseController(
  request: Request,
  response: Response
) {
  try {
    const vendorId = uuidSchema.parse(request.params.id);
    const input = createCaseSchema.parse(request.body);
    const caseRecord = await createOrganizationCase(
      organizationId(request),
      vendorId,
      input.type,
      input.work_start_date
    );
    response.status(201).json(caseRecord);
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(response, error);
      return;
    }
    throw error;
  }
}

export async function getCaseController(request: Request, response: Response) {
  const caseId = uuidSchema.parse(request.params.id);
  const caseRecord = await getOrganizationCase(organizationId(request), caseId);
  if (!caseRecord) {
    response.status(404).json({ error: "Case not found" });
    return;
  }
  response.json(caseRecord);
}

export async function transitionCaseController(
  request: Request,
  response: Response
) {
  try {
    const caseId = uuidSchema.parse(request.params.id);
    const input = transitionCaseSchema.parse(request.body);
    const caseRecord = await transitionOrganizationCase(
      organizationId(request),
      caseId,
      input.status,
      request.user!.id,
      input.metadata
    );
    if (!caseRecord) {
      response.status(404).json({ error: "Case not found" });
      return;
    }
    response.json(caseRecord);
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(response, error);
      return;
    }
    throw error;
  }
}

export async function listCaseEventsController(
  request: Request,
  response: Response
) {
  const caseId = uuidSchema.parse(request.params.id);
  const events = await getOrganizationCaseEvents(
    organizationId(request),
    caseId
  );
  if (!events) {
    response.status(404).json({ error: "Case not found" });
    return;
  }
  response.json(events);
}
