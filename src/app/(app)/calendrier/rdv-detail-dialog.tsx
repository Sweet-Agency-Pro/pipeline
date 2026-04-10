"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
  User,
  Building2,
  Trash2,
  CheckCircle2,
  XCircle,
  CircleDot,
  FileText,
  Edit2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { Profile, RendezVous, RdvStatus } from "@/types";
import { RDV_STATUS_CONFIG } from "@/types";
import { cn } from "@/lib/utils";

interface RdvDetailDialogProps {
  rdv: RendezVous;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onEdit: (rdv: RendezVous) => void;
  profiles: Profile[];
}

export function RdvDetailDialog({
  rdv,
  open,
  onClose,
  onUpdated,
  onEdit,
}: RdvDetailDialogProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const conf = RDV_STATUS_CONFIG[rdv.status as RdvStatus];
  const clientName = rdv.client ? `${rdv.client.first_name} ${rdv.client.last_name}` : null;

  async function updateStatus(status: RdvStatus) {
    setLoading(true);
    await supabase.from("rendez_vous").update({ status }).eq("id", rdv.id);

    // Sync with Google Calendar if possible
    if (rdv.google_event_id && rdv.google_calendar_id) {
      const colorIds = {
        planifie: "1", // Light Blue
        confirme: "10", // Green
        annule: "11",    // Red
        termine: "8",   // Grey
      };

      try {
        await fetch("/api/calendar/events", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calendarId: rdv.google_calendar_id,
            eventId: rdv.google_event_id,
            colorId: colorIds[status] || "10",
          }),
        });
      } catch (err) {
        console.error("GCal sync failed:", err);
      }
    }

    setLoading(false);
    onUpdated();
  }

  async function deleteRdv() {
    if (!confirm("Supprimer ce rendez-vous ?")) return;
    setLoading(true);
    try {
      if (rdv.google_event_id && rdv.google_calendar_id) {
        // Precise delete
        await fetch("/api/calendar/events", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calendarId: rdv.google_calendar_id,
            eventId: rdv.google_event_id
          }),
        });
      } else {
        // Fallback fuzzy delete
        await fetch("/api/calendar/events", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: rdv.title, start: rdv.start_time }),
        });
      }
    } catch { }
    await supabase.from("rendez_vous").delete().eq("id", rdv.id);
    setLoading(false);
    onUpdated();
  }

  const InfoRow = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
    <div className="flex items-center gap-3 text-sm text-slate-300">
      <Icon className="h-4 w-4 text-slate-500 shrink-0" />
      <span>{children}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700/60 text-slate-200 sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header with accent */}
        <div className="border-b border-slate-800 px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="text-lg font-semibold text-white leading-tight">
                {rdv.title}
              </DialogTitle>
              <Badge className={cn("text-[11px] px-2 py-0.5 shrink-0 border-0", conf.bgColor, conf.color)}>
                {conf.label}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        {/* Details */}
        <div className="px-6 py-4 space-y-3">
          <InfoRow icon={Clock}>
            <div>
              <span className="font-medium capitalize">
                {format(parseISO(rdv.start_time), "EEEE d MMMM yyyy", { locale: fr })}
              </span>
              <span className="text-slate-500 ml-2">
                {format(parseISO(rdv.start_time), "HH:mm")} – {format(parseISO(rdv.end_time), "HH:mm")}
              </span>
            </div>
          </InfoRow>

          <InfoRow icon={User}>
            {rdv.assigned_profile?.full_name || rdv.assigned_profile?.email || "—"}
          </InfoRow>

          {clientName && (
            <InfoRow icon={Building2}>
              {clientName}
              {rdv.client?.company && <span className="text-slate-500"> · {rdv.client.company}</span>}
            </InfoRow>
          )}

          {rdv.location && (
            <InfoRow icon={MapPin}>{rdv.location}</InfoRow>
          )}

          {rdv.description && (
            <div className="flex gap-3 text-sm">
              <FileText className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-slate-400 whitespace-pre-wrap">{rdv.description}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {rdv.status !== "confirme" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={loading}
                onClick={() => updateStatus("confirme")}
                className="h-8 text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Confirmer
              </Button>
            )}
            {rdv.status !== "termine" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={loading}
                onClick={() => updateStatus("termine")}
                className="h-8 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <CircleDot className="mr-1.5 h-3.5 w-3.5" />
                Terminé
              </Button>
            )}
            {rdv.status !== "annule" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={loading}
                onClick={() => updateStatus("annule")}
                className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Annuler
              </Button>
            )}
          </div>

          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => onEdit(rdv)}
              className="h-8 text-xs text-slate-500 hover:text-teal-400 hover:bg-teal-500/10"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={deleteRdv}
              className="h-8 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
