"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
import { Loader2, CalendarPlus, ChevronLeft, ChevronRight, Mail, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, addHours, addDays, startOfDay, endOfDay, parseISO, isSameDay, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  "mt-1.5 bg-slate-900/60 border-slate-700/60 text-slate-200 placeholder:text-slate-600 focus-visible:border-teal-500/50 focus-visible:ring-teal-500/20 [color-scheme:dark] w-full";

function DateTimePicker({ value, onChange, label, className }: { value: string, onChange: (v: string) => void, label: string, className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const dateObj = useMemo(() => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [tempTime, setTempTime] = useState(format(dateObj, "HH:mm"));

  useEffect(() => {
    setTempTime(format(dateObj, "HH:mm"));
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const next = new Date(date);
    next.setHours(dateObj.getHours());
    next.setMinutes(dateObj.getMinutes());
    onChange(format(next, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleTimeChange = (newTime: string) => {
    const [h, m] = newTime.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return;
    const next = new Date(dateObj);
    next.setHours(h);
    next.setMinutes(m);
    onChange(format(next, "yyyy-MM-dd'T'HH:mm"));
  };

  const quickTimes = useMemo(() => {
    return Array.from({ length: 24 * 4 }, (_, i) => {
      const h = Math.floor(i / 4).toString().padStart(2, "0");
      const m = ((i % 4) * 15).toString().padStart(2, "0");
      return `${h}:${m}`;
    });
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setTimeout(() => {
        const activeItem = scrollRef.current?.querySelector("[data-active='true']");
        activeItem?.scrollIntoView({ block: "center", behavior: "instant" });
        // Restore focus to input if that's what triggered it
        inputRef.current?.focus();
      }, 50);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-slate-400">{label}</Label>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger className={cn(
          "w-full bg-slate-900/60 border border-slate-700/60 text-slate-200 h-11 px-4 hover:border-slate-600 transition-all flex items-center rounded-xl group shadow-inner relative z-0 outline-none cursor-default",
          !value && "text-slate-500"
        )}>
          {/* Date Part */}
          <div
            className="flex-1 flex items-center cursor-pointer h-full transition-colors hover:text-white"
            onClick={() => !isOpen && setIsOpen(true)}
          >
            <CalendarIcon className="mr-3 h-4 w-4 text-slate-500 group-hover:text-teal-400 transition-colors shrink-0" />
            <span className="flex-1 text-left font-medium truncate">
              {value ? format(dateObj, "d MMM yyyy", { locale: fr }) : "Choisir date"}
            </span>
          </div>

          {value && (
            <div
              className="flex items-center gap-2 ml-2 border-l border-slate-700/60 pl-3 py-1"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <Clock className="h-3.5 w-3.5 text-teal-500/70" />
              <input
                ref={inputRef}
                type="text"
                value={tempTime}
                onFocus={() => setIsOpen(true)}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9:]/g, "");
                  setTempTime(val);
                  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(val)) {
                    const [h, m] = val.split(":").map(Number);
                    const next = new Date(dateObj);
                    next.setHours(h);
                    next.setMinutes(m);
                    onChange(format(next, "yyyy-MM-dd'T'HH:mm"));
                  }
                }}
                onBlur={() => setTempTime(format(dateObj, "HH:mm"))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                className="bg-transparent border-none p-0 tabular-nums font-bold text-teal-400 text-sm w-12 focus:ring-0 focus:outline-none placeholder:text-teal-900 cursor-text"
                placeholder="00:00"
              />
            </div>
          )}
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-slate-900 border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 flex flex-row h-[310px] overflow-hidden rounded-xl border"
          align="start"
          initialFocus={false}
        >
          <div className="shrink-0 bg-slate-900">
            <Calendar
              mode="single"
              selected={dateObj}
              onSelect={handleDateSelect}
              locale={fr}
              className="p-3"
            />
          </div>
          <div className="w-[100px] border-l border-slate-700/60 flex flex-col bg-slate-950/40 backdrop-blur-md h-full">
            <div className="h-12 border-b border-slate-700/60 bg-slate-900/40 shrink-0 flex items-center justify-center">
              <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Heure</span>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
              <div className="p-1.5 flex flex-col gap-1">
                {quickTimes.map((t) => {
                  const isSelected = format(dateObj, "HH:mm") === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      data-active={isSelected}
                      onClick={() => {
                        handleTimeChange(t);
                      }}
                      className={cn(
                        "w-full text-[11px] py-1.5 px-2 rounded-lg transition-all text-center tabular-nums cursor-pointer",
                        isSelected
                          ? "bg-teal-500 text-white font-bold shadow-md shadow-teal-500/20"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

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
    google_calendar: calendarIds[0] || "",
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
        google_calendar: calendarIds[0] || "",
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

    // Push to the selected Google Calendar
    if (!error) {
      const assignedProfile = profiles.find((p) => p.id === form.assigned_to);
      const calendarId = form.google_calendar;
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

  const update = (field: string, val: string) => {
    setForm((f) => {
      const next = { ...f, [field]: val };

      // Si on change la date de début et qu'elle dépasse la date de fin
      if (field === "start_time") {
        const s = new Date(val);
        const e = new Date(f.end_time);

        if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s >= e) {
          // On avance la fin à start + 1h (le décalage par défaut)
          next.end_time = format(addHours(s, 1), "yyyy-MM-dd'T'HH:mm");
        }
      }

      return next;
    });
  };

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
            <div className="grid grid-cols-2 gap-3 items-end">
              <DateTimePicker
                label="Début *"
                value={form.start_time}
                onChange={(v) => update("start_time", v)}
              />
              <DateTimePicker
                label="Fin *"
                value={form.end_time}
                onChange={(v) => update("end_time", v)}
              />
            </div>

            {/* Assigné + Calendrier Google */}
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
                <Label className="text-xs font-medium text-slate-400">Calendrier Google *</Label>
                <select
                  required
                  value={form.google_calendar}
                  onChange={(e) => update("google_calendar", e.target.value)}
                  className={`mt-1.5 ${selectClass}`}
                >
                  {calendarIds.map((cid) => (
                    <option key={cid} value={cid}>
                      {cid.includes("@group.calendar.google.com")
                        ? "Agence Sweet"
                        : cid.split("@")[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Client */}
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
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/60 shrink-0 bg-slate-950/30">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => setPreviewDate(addDays(previewDate, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-tighter font-semibold">Aperçu</span>
                <span className="text-[11px] font-bold text-slate-200 capitalize">
                  {format(previewDate, "EEE d MMM", { locale: fr })}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => setPreviewDate(addDays(previewDate, 1))}>
                <ChevronRight className="h-4 w-4" />
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
                  <div key={h} className="flex border-b border-slate-800/60 group" style={{ height: `${PREVIEW_HOUR_HEIGHT}px` }}>
                    <div className="w-9 shrink-0 bg-slate-950/20 border-r border-slate-800/40 flex items-start justify-end pr-1.5 pt-0.5">
                      <span className="text-[9px] text-slate-600 tabular-nums">
                        {h.toString().padStart(2, "0")}:00
                      </span>
                    </div>
                    <div className="flex-1 group-hover:bg-slate-800/10 transition-colors" />
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
