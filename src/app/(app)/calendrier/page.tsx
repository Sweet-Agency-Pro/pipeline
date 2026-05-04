import { createClient } from "@/lib/supabase/server";
import { CalendrierClient } from "./calendrier-client";
import { loadRdvSharedData, parseGoogleCalendarIds } from "@/lib/rdv-shared-data";

export const dynamic = "force-dynamic";

export default async function CalendrierPage() {
  const supabase = await createClient();
  const [{ profiles, clients }, calendarIds] = await Promise.all([
    loadRdvSharedData(supabase),
    Promise.resolve(parseGoogleCalendarIds()),
  ]);

  return (
    <CalendrierClient
      profiles={profiles}
      clients={clients}
      calendarIds={calendarIds}
    />
  );
}
