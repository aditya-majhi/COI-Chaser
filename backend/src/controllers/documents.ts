import type { Request, Response } from "express";
import { caseBelongsToOrganization } from "../repositories/cases.js";
import { uploadCaseDocument } from "../services/document-service.js";
import { processUploadedDocument } from "../services/document-pipeline.js";
import { logger } from "../utils/logger.js";
import { uuidSchema } from "../validators/domain.js";

export async function uploadDocumentController(
  request: Request,
  response: Response
) {
  const caseId = uuidSchema.parse(request.params.id);
  if (
    !(await caseBelongsToOrganization(request.organizationId as string, caseId))
  ) {
    response.status(404).json({ error: "Case not found" });
    return;
  }
  const file = request.file;
  if (!file) {
    response.status(400).json({ error: "A PDF file is required" });
    return;
  }
  const document = await uploadCaseDocument(
    request.organizationId as string,
    caseId,
    file
  );
  void processUploadedDocument(
    request.organizationId as string,
    caseId,
    document.id
  ).catch(error => {
    logger.error(error, { caseId, documentId: document.id });
  });
  response
    .status(202)
    .json({ ...document, pipeline: { status: "PROCESSING" } });
}
