import { createClient } from "@/lib/supabase/server";
import { CalendrierClient } from "./calendrier-client";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

export default async function CalendrierPage() {
  const supabase = await createClient();

  // Load team members
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  // Load clients for the RDV creation form
  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name, company")
    .neq("status", "perdu")
    .order("last_name");

  // Google Calendar IDs from env (server-side, not public)
  const calendarIds = (process.env.GOOGLE_CALENDAR_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return (
    <CalendrierClient
      profiles={(profiles as Profile[]) || []}
      clients={
        clients?.map((c) => ({
          id: c.id,
          label: `${c.first_name} ${c.last_name}${c.company ? ` (${c.company})` : ""}`,
        })) || []
      }
      calendarIds={calendarIds}
    />
  );
}
