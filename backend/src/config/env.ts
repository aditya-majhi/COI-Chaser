import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  AGENT_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  AWS_REGION: z.string().default("us-east-1"),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL_ID: z.string().default("gemini-2.5-flash-lite"),
  SES_FROM_EMAIL: z.string().email().optional(),
  INBOUND_EMAIL_DOMAIN: z.string().min(1).default("coi.example.com"),
  INTERNAL_API_SECRET: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
