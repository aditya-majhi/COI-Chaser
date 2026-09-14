import { randomUUID } from "node:crypto";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { env } from "../config/env.js";
import { supabaseAdmin } from "./supabase.js";

const ses = new SESv2Client({ region: env.AWS_REGION });

// When SES isn't configured (local/testing), record the message instead of sending it.
async function deliverOrSimulate(input: {
  caseId: string;
  recipient: string;
  replyTo: string;
  subject: string;
  body: string;
}) {
  let providerMessageId: string | null;
  if (env.SES_FROM_EMAIL) {
    const result = await ses.send(
      new SendEmailCommand({
        FromEmailAddress: env.SES_FROM_EMAIL,
        Destination: { ToAddresses: [input.recipient] },
        ReplyToAddresses: [input.replyTo],
        Content: {
          Simple: {
            Subject: { Data: input.subject },
            Body: { Text: { Data: input.body } },
          },
        },
      })
    );
    providerMessageId = result.MessageId ?? null;
  } else {
    providerMessageId = `simulated-${randomUUID()}`;
  }
  await supabaseAdmin.from("messages").insert({
    case_id: input.caseId,
    direction: "OUTBOUND",
    channel: "EMAIL",
    sender: env.SES_FROM_EMAIL ?? "simulated@local.test",
    recipient: input.recipient,
    subject: input.subject,
    body: input.body,
    provider_message_id: providerMessageId,
  });
  return providerMessageId;
}

export async function sendCaseRequest(input: {
  caseId: string;
  inboundAddress: string;
  recipient: string;
  vendorName: string;
  workStartDate: string;
  requirements: unknown;
}) {
  const subject = `Certificate of insurance needed: ${input.vendorName}`;
  const body = [
    `Hello,`,
    `Please send the current certificate of insurance for ${input.vendorName}.`,
    `Work starts: ${input.workStartDate}.`,
    `Requirements: ${JSON.stringify(input.requirements)}`,
    `Reply to this message or email ${input.inboundAddress}.`,
  ].join("\n\n");
  const messageId = await deliverOrSimulate({
    caseId: input.caseId,
    recipient: input.recipient,
    replyTo: input.inboundAddress,
    subject,
    body,
  });
  return { messageId };
}

export async function sendCorrectionRequest(input: {
  caseId: string;
  inboundAddress: string;
  recipient: string;
  vendorName: string;
  deficiencies: string[];
}) {
  const subject = `Correction needed: ${input.vendorName} insurance certificate`;
  const body = `Please send corrected or supporting insurance evidence for ${input.vendorName}. Outstanding items: ${input.deficiencies.join(", ")}. Reply to ${input.inboundAddress}.`;
  return deliverOrSimulate({
    caseId: input.caseId,
    recipient: input.recipient,
    replyTo: input.inboundAddress,
    subject,
    body,
  });
}
