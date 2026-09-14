import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  getCaseByInboundAddress,
  createCaseEvent,
} from "../repositories/cases.js";
import { recordInboundMessage } from "../repositories/requests.js";
import { uploadInboundDocument } from "../services/document-service.js";
import { processUploadedDocument } from "../services/document-pipeline.js";
import { validationError } from "../utils/http.js";
import { logger } from "../utils/logger.js";

const payload = z.object({
  recipient: z.string().email(),
  provider_message_id: z.string().min(1),
  sender: z.string().email(),
  subject: z.string().default(""),
  body: z.string().default(""),
  attachments: z
    .array(
      z.object({
        filename: z.string().min(1),
        content_base64: z.string().min(1),
      })
    )
    .default([]),
});

export async function inboundEmailController(
  request: Request,
  response: Response
) {
  try {
    const input = payload.parse(request.body);
    const caseRecord = await getCaseByInboundAddress(input.recipient);
    if (!caseRecord) {
      response.status(404).json({ error: "Case address not found" });
      return;
    }
    const message = await recordInboundMessage(
      caseRecord.id,
      input.sender,
      input.subject,
      input.body,
      input.provider_message_id
    );
    if (!message) {
      response.status(200).json({ duplicate: true });
      return;
    }
    const documents = [];
    for (const attachment of input.attachments.filter(item =>
      item.filename.toLowerCase().endsWith(".pdf")
    )) {
      documents.push(
        await uploadInboundDocument(
          caseRecord.organization_id,
          caseRecord.id,
          attachment.filename,
          Buffer.from(attachment.content_base64, "base64")
        )
      );
    }
    await createCaseEvent(caseRecord.id, "EMAIL_RECEIVED", "BROKER", {
      provider_message_id: input.provider_message_id,
      documents: documents.map(item => item.id),
    });
    for (const document of documents) {
      void processUploadedDocument(
        caseRecord.organization_id,
        caseRecord.id,
        document.id
      ).catch(error => {
        logger.error(error, {
          caseId: caseRecord.id,
          documentId: document.id,
          providerMessageId: input.provider_message_id,
        });
      });
    }
    response.status(202).json({
      message_id: message.id,
      documents,
      pipeline: { status: "PROCESSING" },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(response, error);
      return;
    }
    throw error;
  }
}
