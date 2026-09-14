import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../services/supabase.js";

export async function createDocument(input: {
  caseId: string;
  storagePath: string;
  filename: string;
  contentType: string;
  size: number;
}) {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .insert({
      case_id: input.caseId,
      storage_path: input.storagePath,
      original_filename: input.filename,
      content_type: input.contentType,
      file_size_bytes: input.size,
      source: "MANUAL_UPLOAD",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function documentStoragePath(
  organizationId: string,
  caseId: string,
  filename: string
) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${organizationId}/${caseId}/${randomUUID()}-${safeName}`;
}
