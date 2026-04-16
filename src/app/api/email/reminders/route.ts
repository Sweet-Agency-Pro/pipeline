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

  // Log d'activation
  console.log(`Rappels cron activé à ${new Date().toISOString()}`);
  const startTime = Date.now();

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
    console.log("Aucun RDV trouvé pour demain.");
    return NextResponse.json({ message: "Aucun rappel à envoyer pour demain" });
  }

  // Calculer le nombre de clients réellement notifiables (avec email)
  // @ts-ignore
  const clientsToSend = rdvs.filter((r: any) => r.clients && r.clients.email);
  const clientsCount = clientsToSend.length;
  console.log(`RDVs trouvés: ${rdvs.length}. Clients avec email: ${clientsCount}`);

  if (clientsCount === 0) {
    console.log("Aucun client avec email à notifier pour demain.");
    return NextResponse.json({ message: "Aucun rappel à envoyer pour demain" });
  }

  const results = {
    total: clientsCount,
    sent: 0,
    errors: 0,
  };

  // 4. Envoyer les emails
  for (const rdv of clientsToSend) {
    const client = rdv.clients;
    if (!client || !client.email) continue;

    try {
      // @ts-ignore - Handle profile being an object or array depending on PostgREST config
      const assignee = Array.isArray(rdv.profiles) ? rdv.profiles[0] : rdv.profiles;

      // Log avant envoi avec infos client
      console.log(`Envoi rappel RDV ${rdv.id} -> ${client.email} (${client.first_name || ''} ${client.last_name || ''}) prévu ${rdv.start_time}`);

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

      // Log succès pour cet envoi
      console.log(`Rappel envoyé pour RDV ${rdv.id} à ${client.email}`);

      // 5. Marquer comme envoyé
      await supabase
        .from("rendez_vous")
        .update({ reminder_sent: true })
        .eq("id", rdv.id);

      results.sent++;
    } catch (err) {
      console.error(`Failed to send reminder for RDV ${rdv.id} -> ${client?.email || 'no-email'}:`, err);
      results.errors++;
    }
  }

  const elapsedMs = Date.now() - startTime;
  console.log(`Rappels cron terminé — Durée: ${elapsedMs}ms. Total: ${results.total}, Envoyés: ${results.sent}, Erreurs: ${results.errors}`);

  return NextResponse.json({ 
    message: "Traitement des rappels terminé",
    results,
    elapsedMs
  });
}
