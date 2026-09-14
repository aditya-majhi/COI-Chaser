import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const dateSchema = z.string().date();
export const emailSchema = z.string().email();

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "slug must be lowercase letters, numbers, and hyphens"
    ),
});

export const createVendorSchema = z.object({
  name: z.string().trim().min(1).max(200),
  legal_name: z.string().trim().max(200).optional(),
  requirements: z.record(z.string(), z.unknown()),
  contacts: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        email: emailSchema,
        role: z.string().trim().max(100).optional(),
        is_primary: z.boolean().default(false),
      })
    )
    .max(20)
    .default([]),
});

export const updateVendorSchema = createVendorSchema
  .pick({ name: true, legal_name: true })
  .partial();

export const assignRequirementsSchema = z.object({
  template_id: uuidSchema.optional(),
  requirements: z.record(z.string(), z.unknown()),
});

export const createCaseSchema = z.object({
  type: z.enum(["INITIAL", "RENEWAL"]).default("INITIAL"),
  work_start_date: dateSchema,
});

export const transitionCaseSchema = z.object({
  status: z.enum([
    "REQUEST_READY",
    "WAITING_FOR_DOCUMENT",
    "DOCUMENT_RECEIVED",
    "PROCESSING",
    "NON_COMPLIANT",
    "WAITING_FOR_CORRECTION",
    "UNDER_REVIEW",
    "COMPLIANT",
    "CLEARED",
    "BLOCKED",
    "HUMAN_REVIEW",
    "CLOSED",
  ]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
