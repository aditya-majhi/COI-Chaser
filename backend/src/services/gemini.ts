import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";
import type { ExtractedInsurance } from "../types/insurance.js";

const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const extractionPrompt = `Classify this PDF by its contents, never its filename. Return JSON only. Use document_type CERTIFICATE_OF_INSURANCE for a COI, ENDORSEMENT for an insurance endorsement, UNRELATED for invoices/W-9s/other non-insurance files, or UNKNOWN when genuinely ambiguous. Never invent missing values; use null and confidence 0 for missing or ambiguous fields. Return this shape: {"document_type":"CERTIFICATE_OF_INSURANCE|ENDORSEMENT|UNKNOWN|UNRELATED","named_insured":string|null,"general_liability":{"each_occurrence":{"value":number|string|null,"confidence":number},"aggregate":{"value":number|string|null,"confidence":number},"effective_date":{"value":string|null,"confidence":number},"expiration_date":{"value":string|null,"confidence":number}},"workers_comp":{"present":{"value":boolean|null,"confidence":number}},"auto_liability":{"limit":{"value":number|string|null,"confidence":number},"effective_date":{"value":string|null,"confidence":number},"expiration_date":{"value":string|null,"confidence":number}},"additional_insured":{"value":boolean|null,"confidence":number},"waiver_of_subrogation":{"value":boolean|null,"confidence":number}}`;

export async function extractInsuranceDocument(
  document: Uint8Array
): Promise<ExtractedInsurance> {
  const response = await client.models.generateContent({
    model: env.GEMINI_MODEL_ID,
    contents: [
      { text: extractionPrompt },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: Buffer.from(document).toString("base64"),
        },
      },
    ],
    config: { temperature: 0, responseMimeType: "application/json" },
  });
  const text = response.text?.trim();
  if (!text) throw new Error("Gemini returned no extraction");
  console.log("[gemini] raw model text:", text);
  const parsed = JSON.parse(
    text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()
  ) as ExtractedInsurance;
  console.log("[gemini] parsed document_type:", parsed.document_type);
  return parsed;
}
