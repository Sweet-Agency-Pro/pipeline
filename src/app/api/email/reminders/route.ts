import { NextRequest, NextResponse } from "next/server";
import { sendRdvEmail } from "@/lib/email-service";
import { insertEmailLog, toErrorMessage } from "@/lib/email-logs";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { getServiceRoleClient } from "@/lib/supabase/admin";

interface ReminderClient {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface ReminderProfile {
  full_name: string | null;
}

interface ReminderRdv {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  description: string | null;
  clients: ReminderClient | null;
  profiles: ReminderProfile | ReminderProfile[] | null;
}

function getAssignee(profile: ReminderRdv["profiles"]): ReminderProfile | null {
  if (!profile) {
    return null;
  }

  return Array.isArray(profile) ? (profile[0] ?? null) : profile;
}

export async function POST(request: NextRequest) {
  // 1. Protection par secret
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Log d'activation
  console.log(`Rappels cron activé à ${new Date().toISOString()}`);
  const startTime = Date.now();

  // Service role nécessaire pour bypasser la RLS sur les traitements Cron.
  const supabase = getServiceRoleClient();

  // 2. Définir la plage horaire pour demain (J+1)
  const tomorrow = addDays(new Date(), 1);
  const dayStart = startOfDay(tomorrow).toISOString();
  const dayEnd = endOfDay(tomorrow).toISOString();

  // 3. Récupérer les rendez-vous de demain qui n'ont pas encore eu de rappel
  const { data: rdvsData, error } = await supabase
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

  const rdvs = (rdvsData ?? []) as ReminderRdv[];

  if (error) {
    console.error("Error fetching rdvs:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des RDVs" }, { status: 500 });
  }

  if (!rdvs || rdvs.length === 0) {
    console.log("Aucun RDV trouvé pour demain.");
    return NextResponse.json({ message: "Aucun rappel à envoyer pour demain" });
  }

  // Calculer le nombre de clients réellement notifiables (avec email)
  const clientsToSend = rdvs.filter((rdv) => Boolean(rdv.clients?.email));
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
    details: [] as Array<{
      rdvId: string;
      recipient: string;
      status: "sent" | "failed";
      messageId: string | null;
      error: string | null;
    }>,
  };

  // 4. Envoyer les emails
  for (const rdv of clientsToSend) {
    const client = rdv.clients;
    if (!client || !client.email) continue;

    try {
      const assignee = getAssignee(rdv.profiles);

      // Log avant envoi avec infos client
      console.log(`Envoi rappel RDV ${rdv.id} -> ${client.email} (${client.first_name || ''} ${client.last_name || ''}) prévu ${rdv.start_time}`);

      const delivery = await sendRdvEmail({
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
      console.log(`Rappel envoyé pour RDV ${rdv.id} à ${client.email} (messageId=${delivery.messageId})`);

      await insertEmailLog(supabase, {
        emailType: "reminder",
        status: "sent",
        recipient: client.email,
        subject: `Rappel : Votre rendez-vous de demain - ${rdv.title}`,
        rdvId: rdv.id,
        source: "cron",
        messageId: delivery.messageId,
        providerResponse: delivery.response,
        accepted: delivery.accepted,
        rejected: delivery.rejected,
        metadata: {
          start: rdv.start_time,
          end: rdv.end_time,
          location: rdv.location || null,
          title: rdv.title,
        },
      });

      // 5. Marquer comme envoyé
      const { error: updateError } = await supabase
        .from("rendez_vous")
        // Service-role client is intentionally schema-agnostic in this route.
        .update({ reminder_sent: true } as never)
        .eq("id", rdv.id);

      if (updateError) {
        console.error(`Unable to mark reminder as sent for RDV ${rdv.id}:`, updateError);
      }

      results.sent++;
      results.details.push({
        rdvId: rdv.id,
        recipient: client.email,
        status: "sent",
        messageId: delivery.messageId,
        error: null,
      });
    } catch (err) {
      console.error(`Failed to send reminder for RDV ${rdv.id} -> ${client?.email || 'no-email'}:`, err);

      await insertEmailLog(supabase, {
        emailType: "reminder",
        status: "failed",
        recipient: client?.email || "unknown",
        subject: `Rappel : Votre rendez-vous de demain - ${rdv.title}`,
        rdvId: rdv.id,
        source: "cron",
        errorMessage: toErrorMessage(err),
        metadata: {
          start: rdv.start_time,
          end: rdv.end_time,
          location: rdv.location || null,
          title: rdv.title,
        },
      });

      results.errors++;
      results.details.push({
        rdvId: rdv.id,
        recipient: client?.email || "unknown",
        status: "failed",
        messageId: null,
        error: toErrorMessage(err),
      });
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
