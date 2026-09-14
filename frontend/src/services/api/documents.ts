import { apiRequest } from "./client";

export function uploadDocument(
  organizationId: string,
  caseId: string,
  file: File
) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<unknown>(
    `/cases/${caseId}/documents`,
    { method: "POST", data: formData },
    organizationId
  );
}
