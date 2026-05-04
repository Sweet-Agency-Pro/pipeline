import type { Client, ClientStatus } from "@/types";
import type { LooseSupabaseClient as SupabaseLike } from "@/lib/supabase/loose-types";

export interface ClientPayload {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: ClientStatus;
  source: string | null;
  github_url: string | null;
  estimated_amount: number;
  notes: string | null;
  last_contacted_at?: string | null;
}

interface ParseClientFormOptions {
  defaultStatus?: ClientStatus;
  includeLastContactedAt?: boolean;
}

function toOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toRequiredString(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function toAmount(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseClientFormData(
  formData: FormData,
  { defaultStatus = "prospect", includeLastContactedAt = false }: ParseClientFormOptions = {}
): ClientPayload {
  const statusValue = formData.get("status");
  const status =
    typeof statusValue === "string" && statusValue.length > 0
      ? (statusValue as ClientStatus)
      : defaultStatus;

  return {
    first_name: toRequiredString(formData.get("first_name")),
    last_name: toRequiredString(formData.get("last_name")),
    email: toOptionalString(formData.get("email")),
    phone: toOptionalString(formData.get("phone")),
    company: toOptionalString(formData.get("company")),
    status,
    source: toOptionalString(formData.get("source")),
    github_url: toOptionalString(formData.get("github_url")),
    estimated_amount: toAmount(formData.get("estimated_amount")),
    notes: toOptionalString(formData.get("notes")),
    ...(includeLastContactedAt
      ? { last_contacted_at: new Date().toISOString() }
      : {}),
  };
}

export async function fetchClientById(supabase: SupabaseLike, id: string) {
  return supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single<Client>();
}

export async function createClientRecord(
  supabase: SupabaseLike,
  payload: ClientPayload,
  metadata?: { createdBy?: string; assignedTo?: string }
) {
  return supabase
    .from("clients")
    .insert({
      ...payload,
      created_by: metadata?.createdBy ?? null,
      assigned_to: metadata?.assignedTo ?? null,
    })
    .select()
    .single<Client>();
}

export async function updateClientRecord(
  supabase: SupabaseLike,
  id: string,
  payload: ClientPayload
) {
  return supabase
    .from("clients")
    .update(payload)
    .eq("id", id)
    .select()
    .single<Client>();
}

export async function updateClientStatus(
  supabase: SupabaseLike,
  id: string,
  status: ClientStatus
) {
  return supabase
    .from("clients")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .single<{ id: string; status: ClientStatus }>();
}

export async function deleteClientRecord(supabase: SupabaseLike, id: string) {
  return supabase.from("clients").delete().eq("id", id);
}