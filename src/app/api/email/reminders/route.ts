import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendRdvEmail } from "@/lib/email-service";
import { startOfDay, endOfDay, addDays } from "date-fns";

export async function POST(request: NextRequest) {
  // 1. Protection par secret
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Utilisation de la SERVICE_ROLE_KEY pour bypasser la RLS (indispensable pour les Cron Jobs)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 2. Définir la plage horaire pour demain (J+1)
  const tomorrow = addDays(new Date(), 1);
  const dayStart = startOfDay(tomorrow).toISOString();
  const dayEnd = endOfDay(tomorrow).toISOString();

  // 3. Récupérer les rendez-vous de demain qui n'ont pas encore eu de rappel
  const { data: rdvs, error } = await supabase
    .from("rendez_vous")
    .select(`
      *,
      clients (
        email,
        first_name,
        last_name
      ),
      profiles!rendez_vous_assigned_to_fkey (
        full_name
      )
    `)
    .gte("start_time", dayStart)
    .lte("start_time", dayEnd)
    .eq("reminder_sent", false);

  if (error) {
    console.error("Error fetching rdvs:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des RDVs" }, { status: 500 });
  }

  if (!rdvs || rdvs.length === 0) {
    return NextResponse.json({ message: "Aucun rappel à envoyer pour demain" });
  }

  const results = {
    total: rdvs.length,
    sent: 0,
    errors: 0,
  };

  // 4. Envoyer les emails
  for (const rdv of rdvs) {
    const client = rdv.clients;
    if (!client || !client.email) continue;

    try {
      // @ts-ignore - Handle profile being an object or array depending on PostgREST config
      const assignee = Array.isArray(rdv.profiles) ? rdv.profiles[0] : rdv.profiles;

      await sendRdvEmail({
        clientEmail: client.email,
        clientFirstName: client.first_name || "Client",
        assignedName: assignee?.full_name || "l'équipe Sweet",
        title: rdv.title,
        start: rdv.start_time,
        end: rdv.end_time,
        location: rdv.location,
        description: rdv.description,
        isReminder: true,
      });

      // 5. Marquer comme envoyé
      await supabase
        .from("rendez_vous")
        .update({ reminder_sent: true })
        .eq("id", rdv.id);

      results.sent++;
    } catch (err) {
      console.error(`Failed to send reminder for RDV ${rdv.id}:`, err);
      results.errors++;
    }
  }

  return NextResponse.json({ 
    message: "Traitement des rappels terminé",
    results 
  });
}
