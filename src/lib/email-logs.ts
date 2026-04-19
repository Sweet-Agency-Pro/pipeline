export type EmailLogType = "confirmation" | "update" | "reminder";
export type EmailLogStatus = "sent" | "failed";
export type EmailLogSource = "manual" | "cron";

export interface EmailLogInput {
  emailType: EmailLogType;
  status: EmailLogStatus;
  recipient: string;
  subject?: string | null;
  rdvId?: string | null;
  source: EmailLogSource;
  messageId?: string | null;
  providerResponse?: string | null;
  accepted?: string[];
  rejected?: string[];
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
}

export async function insertEmailLog(supabase: any, input: EmailLogInput): Promise<void> {
  const { error } = await supabase.from("email_logs").insert({
    email_type: input.emailType,
    status: input.status,
    recipient: input.recipient,
    subject: input.subject || null,
    rdv_id: input.rdvId || null,
    source: input.source,
    message_id: input.messageId || null,
    provider_response: input.providerResponse || null,
    accepted: input.accepted || [],
    rejected: input.rejected || [],
    error_message: input.errorMessage || null,
    metadata: input.metadata || {},
    created_by: input.createdBy || null,
  });

  if (error) {
    console.error("Unable to persist email log:", error);
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}
