import type { Profile } from "@/types";
import { getClientLabel } from "@/lib/utils";
import type { LooseSupabaseClient as SupabaseLike } from "@/lib/supabase/loose-types";

const RDV_ELIGIBLE_CLIENT_STATUSES = [
  "qualifie",
  "proposition",
  "negociation",
  "gagne",
] as const;

interface RdvClientRow {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
}

export function parseGoogleCalendarIds(raw = process.env.GOOGLE_CALENDAR_IDS || ""): string[] {
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function loadRdvSharedData(supabase: SupabaseLike): Promise<{
  profiles: Profile[];
  clients: Array<{ id: string; label: string }>;
}> {
  const [profilesRes, clientsRes] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase
      .from("clients")
      .select("id, first_name, last_name, company")
      .in("status", RDV_ELIGIBLE_CLIENT_STATUSES)
      .order("last_name"),
  ]);

  const profileRows = (profilesRes.data as Profile[] | null) ?? [];
  const clientRows = (clientsRes.data as RdvClientRow[] | null) ?? [];

  return {
    profiles: profileRows,
    clients: clientRows.map((client) => ({
      id: client.id,
      label: getClientLabel(client),
    })),
  };
}