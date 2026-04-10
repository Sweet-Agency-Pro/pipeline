import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COLOR_MAP, updateGoogleEventColor } from "../events/route";

export const dynamic = "force-dynamic";

/**
 * Route API pour clore automatiquement les rendez-vous passés
 * Appelée par une Supabase Edge Function ou un Cron job
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Vérification de sécurité simple via une clé dans les headers
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Trouver les rendez-vous périmés
    const now = new Date().toISOString();
    const { data: expiredRdvs, error: fetchError } = await supabase
      .from("rendez_vous")
      .select("*")
      .in("status", ["planifie", "confirme"])
      .lt("end_time", now);

    if (fetchError) throw fetchError;
    if (!expiredRdvs || expiredRdvs.length === 0) {
      return NextResponse.json({ message: "Aucun rendez-vous à clore" });
    }

    const results = [];

    // 3. Traiter chaque rendez-vous
    for (const rdv of expiredRdvs) {
      try {
        // A. Mise à jour Supabase
        const { error: updateError } = await supabase
          .from("rendez_vous")
          .update({ status: "termine", updated_at: now })
          .eq("id", rdv.id);

        if (updateError) throw updateError;

        // B. Synchronisation Google Calendar (via notre fonction partagée)
        if (rdv.google_event_id && rdv.google_calendar_id) {
          await updateGoogleEventColor(
            rdv.google_calendar_id, 
            rdv.google_event_id, 
            COLOR_MAP.termine
          );
        }

        results.push({ id: rdv.id, title: rdv.title, success: true });
      } catch (err) {
        results.push({ id: rdv.id, title: rdv.title, success: false, error: String(err) });
      }
    }

    return NextResponse.json({
      processed: expiredRdvs.length,
      results
    });
  } catch (error) {
    console.error("[CRON] Auto-complete error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
