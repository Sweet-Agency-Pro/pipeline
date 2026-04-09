"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CalendarPlus, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { format, addHours, addDays, startOfDay, endOfDay, parseISO, isSameDay, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Profile, GoogleCalendarEvent, RendezVous } from "@/types";

interface NouveauRdvDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  profiles: Profile[];
  clients: { id: string; label: string }[];
  calendarIds: string[];
  defaultClientId?: string;
}

function getDefaults() {
  const now = new Date();
  return {
    start: format(now, "yyyy-MM-dd'T'HH:mm"),
    end: format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm"),
  };
}

const PREVIEW_HOUR_START = 7;
const PREVIEW_HOUR_END = 21;
const PREVIEW_HOUR_HEIGHT = 40;
const PREVIEW_TOTAL_HOURS = PREVIEW_HOUR_END - PREVIEW_HOUR_START;

const CALENDAR_COLORS = [
  { bg: "bg-amber-400/15", border: "border-l-amber-400", text: "text-amber-300" },
  { bg: "bg-violet-400/15", border: "border-l-violet-400", text: "text-violet-300" },
  { bg: "bg-rose-400/15", border: "border-l-rose-400", text: "text-rose-300" },
  { bg: "bg-sky-400/15", border: "border-l-sky-400", text: "text-sky-300" },
];

const selectClass =
  "w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors";

const inputClass =
  "mt-1.5 bg-slate-900/60 border-slate-700/60 text-slate-200 placeholder:text-slate-600 focus-visible:border-teal-500/50 focus-visible:ring-teal-500/20";

export function NouveauRdvDialog({
  open,
  onClose,
  onCreated,
  profiles,
  clients,
  calendarIds,
  defaultClientId,
}: NouveauRdvDialogProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [previewDate, setPreviewDate] = useState(new Date());

  const DEFAULT_LOCATION = "https://meet.jit.si/moderated/117468440a2b76fc5985814acb28979efa70738c0e01a5e1e4e8e918f27a4ec9";

  const [clientEmail, setClientEmail] = useState("");
  const [clientHasEmail, setClientHasEmail] = useState(true);

  const [form, setForm] = useState({
    title: "",
    client_id: "",
    assigned_to: profiles[0]?.id || "",
    start_time: "",
    end_time: "",
    location: DEFAULT_LOCATION,
    description: "",
  });

  useEffect(() => {
    if (open) {
      const defaults = getDefaults();
      setForm({
        title: "",
        client_id: defaultClientId || "",
        assigned_to: profiles[0]?.id || "",
        start_time: defaults.start,
        end_time: defaults.end,
        location: DEFAULT_LOCATION,
        description: "",
      });
      setPreviewDate(new Date());
      setClientEmail("");
      setClientHasEmail(true);
    }
  }, [open, profiles, defaultClientId]);

  // Fetch client email when client changes
  useEffect(() => {
    if (!form.client_id) {
      setClientEmail("");
      setClientHasEmail(true);
      return;
    }
    supabase
      .from("clients")
      .select("email")
      .eq("id", form.client_id)
      .single()
      .then(({ data }) => {
        if (data?.email) {
          setClientEmail(data.email);
          setClientHasEmail(true);
        } else {
          setClientEmail("");
          setClientHasEmail(false);
        }
      });
  }, [form.client_id, supabase]);

  // Sync preview date when start_time changes
  useEffect(() => {
    if (form.start_time) {
      const d = new Date(form.start_time);
      if (!isNaN(d.getTime())) setPreviewDate(d);
    }
  }, [form.start_time]);

  // Fetch events for the preview date
  const loadPreviewEvents = useCallback(async () => {
    const dayStart = startOfDay(previewDate).toISOString();
    const dayEnd = endOfDay(previewDate).toISOString();

    const [googleRes, rdvRes] = await Promise.all([
      fetch(`/api/calendar/availability?start=${dayStart}&end=${dayEnd}`).then((r) => r.ok ? r.json() : { events: {} }).catch(() => ({ events: {} })),
      supabase.from("rendez_vous").select("*").gte("start_time", dayStart).lte("start_time", dayEnd).order("start_time"),
    ]);

    const all: GoogleCalendarEvent[] = [];
    if (googleRes.events) {
      for (const [calId, calEvents] of Object.entries(googleRes.events)) {
        for (const event of calEvents as GoogleCalendarEvent[]) {
          all.push({ ...event, calendarId: calId });
        }
      }
    }
    setGoogleEvents(all);
    setRdvs((rdvRes.data as RendezVous[]) || []);
  }, [previewDate, supabase]);

  useEffect(() => {
    if (open) loadPreviewEvents();
  }, [open, loadPreviewEvents]);

  // Color map
  const uniqueCalIds = useMemo(() => [...new Set(googleEvents.map((e) => e.calendarId))], [googleEvents]);
  const calColors = useMemo(
    () => Object.fromEntries(uniqueCalIds.map((id, i) => [id, CALENDAR_COLORS[i % CALENDAR_COLORS.length]])),
    [uniqueCalIds]
  );

  const previewHours = useMemo(() => Array.from({ length: PREVIEW_TOTAL_HOURS }, (_, i) => PREVIEW_HOUR_START + i), []);

  const dayEvents = useMemo(() => googleEvents.filter((e) => !e.allDay && isSameDay(parseISO(e.start), previewDate)), [googleEvents, previewDate]);
  const dayRdvs = useMemo(() => rdvs.filter((r) => isSameDay(parseISO(r.start_time), previewDate)), [rdvs, previewDate]);

  function getBlockStyle(startStr: string, endStr: string) {
    const s = parseISO(startStr);
    const e = parseISO(endStr);
    const topMin = (s.getHours() - PREVIEW_HOUR_START) * 60 + s.getMinutes();
    const dur = differenceInMinutes(e, s);
    return { top: `${(topMin / 60) * PREVIEW_HOUR_HEIGHT}px`, height: `${Math.max((dur / 60) * PREVIEW_HOUR_HEIGHT, 14)}px` };
  }

  // New RDV overlay on preview
  const newRdvOverlay = useMemo(() => {
    if (!form.start_time || !form.end_time) return null;
    const s = new Date(form.start_time);
    const e = new Date(form.end_time);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || !isSameDay(s, previewDate)) return null;
    const topMin = (s.getHours() - PREVIEW_HOUR_START) * 60 + s.getMinutes();
    const dur = differenceInMinutes(e, s);
    if (topMin < 0 || dur <= 0) return null;
    return { top: `${(topMin / 60) * PREVIEW_HOUR_HEIGHT}px`, height: `${Math.max((dur / 60) * PREVIEW_HOUR_HEIGHT, 14)}px` };
  }, [form.start_time, form.end_time, previewDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const startISO = new Date(form.start_time).toISOString();
    const endISO = new Date(form.end_time).toISOString();

    const { error } = await supabase.from("rendez_vous").insert({
      title: form.title,
      client_id: form.client_id || null,
      assigned_to: form.assigned_to,
      start_time: startISO,
      end_time: endISO,
      location: form.location || null,
      description: form.description || null,
      created_by: user?.id,
    });

    // Push to the assigned profile's Google Calendar
    if (!error) {
      const assignedProfile = profiles.find((p) => p.id === form.assigned_to);
      const calendarId = calendarIds.find((cid) => assignedProfile?.email && cid.toLowerCase() === assignedProfile.email.toLowerCase());
      if (calendarId) {
        try {
          await fetch("/api/calendar/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              calendarId,
              title: form.title,
              start: startISO,
              end: endISO,
              location: form.location || undefined,
              description: form.description || undefined,
            }),
          });
        } catch {
          // Google Calendar push failed silently — RDV is already saved
        }
      }

      // Save email to client if it was manually entered
      const emailToUse = clientEmail.trim();
      if (form.client_id && emailToUse && !clientHasEmail) {
        await supabase
          .from("clients")
          .update({ email: emailToUse })
          .eq("id", form.client_id);
      }

      // Send confirmation email to client
      if (form.client_id && emailToUse) {
        try {
          const { data: clientData } = await supabase
            .from("clients")
            .select("first_name, last_name")
            .eq("id", form.client_id)
            .single();
          if (clientData) {
            await fetch("/api/email/rdv-confirmation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                clientEmail: emailToUse,
                clientName: `${clientData.first_name} ${clientData.last_name}`,
                title: form.title,
                start: startISO,
                end: endISO,
                location: form.location || undefined,
                description: form.description || undefined,
                assignedName: assignedProfile?.full_name || undefined,
              }),
            });
          }
        } catch {
          // Email failed silently — RDV is already saved
        }
      }
    }

    setLoading(false);
    if (!error) onCreated();
  }

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700/60 text-slate-200 sm:max-w-4xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold text-white">Nouveau rendez-vous</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0">
          {/* ── Left: Form ── */}
          <form onSubmit={handleSubmit} className="flex-1 px-6 pb-6 space-y-4 overflow-y-auto max-h-[70vh]">
            {/* Titre */}
            <div>
              <Label className="text-xs font-medium text-slate-400">Titre *</Label>
              <Input
                required
                autoFocus
                placeholder="Ex: Présentation projet"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Date / Heure */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-400">Début *</Label>
                <Input
                  type="datetime-local"
                  required
                  value={form.start_time}
                  onChange={(e) => update("start_time", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-400">Fin *</Label>
                <Input
                  type="datetime-local"
                  required
                  value={form.end_time}
                  onChange={(e) => update("end_time", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Assigné + Client */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-400">Assigné à *</Label>
                <select
                  required
                  value={form.assigned_to}
                  onChange={(e) => update("assigned_to", e.target.value)}
                  className={`mt-1.5 ${selectClass}`}
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-400">Client</Label>
                <select
                  value={form.client_id}
                  onChange={(e) => update("client_id", e.target.value)}
                  className={`mt-1.5 ${selectClass}`}
                >
                  <option value="">— Aucun —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Email client */}
            {form.client_id && !clientHasEmail && (
              <div>
                <Label className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                  <Mail className="h-3 w-3" />
                  Email du client (manquant)
                </Label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className={`${inputClass} border-amber-500/30 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20`}
                />
                <p className="text-[10px] text-slate-500 mt-1">L&apos;email sera sauvegardé sur la fiche client</p>
              </div>
            )}

            {/* Lieu */}
            <div>
              <Label className="text-xs font-medium text-slate-400">Lieu</Label>
              <Input
                placeholder="Visio / Bureau / Adresse..."
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs font-medium text-slate-400">Notes</Label>
              <Textarea
                placeholder="Informations complémentaires..."
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className={`mt-1.5 bg-slate-900/60 border-slate-700/60 text-slate-200 placeholder:text-slate-600 focus-visible:border-teal-500/50 focus-visible:ring-teal-500/20 resize-none`}
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="bg-teal-500 text-white hover:bg-teal-600 border-0 shadow-sm shadow-teal-500/20"
              >
                {loading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                )}
                {loading ? "Création..." : "Créer le RDV"}
              </Button>
            </div>
          </form>

          {/* ── Right: Day Preview ── */}
          <div className="w-[260px] shrink-0 border-l border-slate-700/60 flex flex-col min-h-0">
            {/* Day nav */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700/40 shrink-0">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => setPreviewDate(addDays(previewDate, -1))}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium text-slate-300 capitalize">
                {format(previewDate, "EEE d MMM", { locale: fr })}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={() => setPreviewDate(addDays(previewDate, 1))}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Legend */}
            {uniqueCalIds.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700/40 shrink-0">
                {uniqueCalIds.map((id) => (
                  <div key={id} className="flex items-center gap-1">
                    <div className={cn("h-1.5 w-1.5 rounded-full", calColors[id]?.text?.replace("text-", "bg-"))} />
                    <span className="text-[9px] text-slate-500">{id.split("@")[0]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Day grid */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="relative">
                {previewHours.map((h) => (
                  <div key={h} className="flex border-b border-slate-800/60" style={{ height: `${PREVIEW_HOUR_HEIGHT}px` }}>
                    <span className="w-8 shrink-0 text-[9px] text-slate-600 text-right pr-1.5 -mt-1 tabular-nums">
                      {h.toString().padStart(2, "0")}:00
                    </span>
                    <div className="flex-1" />
                  </div>
                ))}

                {/* Existing Google events */}
                {dayEvents.map((event) => {
                  const style = getBlockStyle(event.start, event.end);
                  const colors = calColors[event.calendarId];
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "absolute left-8 right-1 rounded px-1.5 py-0.5 overflow-hidden border-l-2",
                        colors?.bg, colors?.border
                      )}
                      style={style}
                    >
                      <p className={cn("text-[10px] font-medium truncate leading-tight", colors?.text)}>{event.title}</p>
                      <p className="text-[9px] text-slate-500 truncate">
                        {format(parseISO(event.start), "HH:mm")}–{format(parseISO(event.end), "HH:mm")}
                      </p>
                    </div>
                  );
                })}

                {/* Existing Pipeline RDVs */}
                {dayRdvs.map((rdv) => {
                  const style = getBlockStyle(rdv.start_time, rdv.end_time);
                  return (
                    <div
                      key={rdv.id}
                      className="absolute left-8 right-1 rounded px-1.5 py-0.5 overflow-hidden border-l-2 bg-teal-500/10 border-l-teal-400"
                      style={style}
                    >
                      <p className="text-[10px] font-medium text-teal-300 truncate leading-tight">{rdv.title}</p>
                      <p className="text-[9px] text-slate-500 truncate">
                        {format(parseISO(rdv.start_time), "HH:mm")}–{format(parseISO(rdv.end_time), "HH:mm")}
                      </p>
                    </div>
                  );
                })}

                {/* New RDV overlay */}
                {newRdvOverlay && (
                  <div
                    className="absolute left-8 right-1 rounded px-1.5 py-0.5 overflow-hidden border-l-2 bg-teal-500/25 border-l-teal-300 border border-teal-400/40 z-10"
                    style={newRdvOverlay}
                  >
                    <p className="text-[10px] font-semibold text-teal-200 truncate leading-tight">
                      {form.title || "Nouveau RDV"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
