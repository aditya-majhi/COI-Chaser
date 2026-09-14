import type { Express } from "express";
import {
  createDocument,
  documentStoragePath,
} from "../repositories/documents.js";
import { supabaseAdmin } from "./supabase.js";

const bucket = "coi-documents";

export async function uploadCaseDocument(
  organizationId: string,
  caseId: string,
  file: Express.Multer.File
) {
  if (
    file.mimetype !== "application/pdf" ||
    !file.originalname.toLowerCase().endsWith(".pdf")
  ) {
    const error = new Error("Only PDF documents are supported");
    error.name = "UnsupportedDocumentError";
    throw error;
  }

  const storagePath = documentStoragePath(
    organizationId,
    caseId,
    file.originalname
  );
  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, file.buffer, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  try {
    return await createDocument({
      caseId,
      storagePath,
      filename: file.originalname,
      contentType: file.mimetype,
      size: file.size,
    });
  } catch (error) {
    await supabaseAdmin.storage.from(bucket).remove([storagePath]);
    throw error;
  }
}

export async function uploadInboundDocument(
  organizationId: string,
  caseId: string,
  filename: string,
  buffer: Buffer
) {
  return uploadCaseDocument(organizationId, caseId, {
    originalname: filename,
    mimetype: "application/pdf",
    buffer,
    size: buffer.length,
  } as Express.Multer.File);
}
