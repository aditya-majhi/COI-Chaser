import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  getDocumentForCase,
  saveExtraction,
} from "../repositories/extraction.js";
import { extractInsuranceDocument } from "../services/gemini.js";
import { supabaseAdmin } from "../services/supabase.js";
import { validationError } from "../utils/http.js";

export async function extractDocumentController(
  request: Request,
  response: Response
) {
  try {
    const { caseId, documentId } = z
      .object({ caseId: z.string().uuid(), documentId: z.string().uuid() })
      .parse(request.params);
    const document = await getDocumentForCase(
      request.organizationId as string,
      caseId,
      documentId
    );
    if (!document) {
      response.status(404).json({ error: "Document not found" });
      return;
    }
    const { data, error } = await supabaseAdmin.storage
      .from("coi-documents")
      .download(document.storage_path);
    if (error) throw error;
    const extraction = await extractInsuranceDocument(
      new Uint8Array(await data.arrayBuffer())
    );
    response
      .status(201)
      .json(
        await saveExtraction(
          documentId,
          extraction,
          extraction.document_type ?? "UNKNOWN"
        )
      );
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(response, error);
      return;
    }
    throw error;
  }
}
