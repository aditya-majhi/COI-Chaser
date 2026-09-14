import type { Request, Response } from "express";
import { ZodError } from "zod";
import { createOrganizationSchema } from "../validators/domain.js";
import { validationError } from "../utils/http.js";
import { registerOrganization } from "../services/organization-service.js";

export async function createOrganizationController(
  request: Request,
  response: Response
) {
  try {
    const input = createOrganizationSchema.parse(request.body);
    const organization = await registerOrganization(
      input.name,
      input.slug,
      request.user!.id
    );
    response.status(201).json(organization);
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(response, error);
      return;
    }
    throw error;
  }
}
