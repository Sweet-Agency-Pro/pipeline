import { createClient } from "@/lib/supabase/server";
import { RdvList } from "./rdv-list";
import type { RendezVous } from "@/types";
import { loadRdvSharedData, parseGoogleCalendarIds } from "@/lib/rdv-shared-data";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default async function RendezVousPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ filter?: string }> 
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: rdvs }, { profiles, clients }] = await Promise.all([
    supabase
      .from("rendez_vous")
      .select("*, client:clients(*), assigned_profile:profiles!rendez_vous_assigned_to_fkey(*)")
      .order("start_time", { ascending: true }),
    loadRdvSharedData(supabase),
  ]);

  const calendarIds = parseGoogleCalendarIds();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rendez-vous"
        description="Consultez et gérez vos rendez-vous planifiés"
      />
      
      <RdvList 
        initialRdvs={(rdvs as RendezVous[]) || []} 
        profiles={profiles}
        clients={clients}
        calendarIds={calendarIds}
        currentFilter={params.filter as any}
      />
    </div>
  );
}
