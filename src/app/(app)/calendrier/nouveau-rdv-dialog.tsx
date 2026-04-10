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
import { Loader2, CalendarPlus, ChevronLeft, ChevronRight, Mail, Calendar as CalendarIcon, Clock, Check, HelpCircle, Search, X, Copy, ExternalLink, Video, MapPin } from "lucide-react";
import { format, addHours, addMinutes, addDays, startOfDay, endOfDay, parseISO, isSameDay, differenceInMinutes } from "date-fns";
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
  initialRdv?: RendezVous;
}

function getDefaults() {
  const now = new Date();
  return {
    start: format(now, "yyyy-MM-dd'T'HH:mm"),
    end: format(addMinutes(now, 30), "yyyy-MM-dd'T'HH:mm"),
  };
}

const PREVIEW_HOUR_START = 0;
const PREVIEW_HOUR_END = 24;
const PREVIEW_HOUR_HEIGHT = 40;
const PREVIEW_TOTAL_HOURS = PREVIEW_HOUR_END - PREVIEW_HOUR_START;

const CALENDAR_COLORS = [
  { bg: "bg-cyan-400/60", border: "border-l-cyan-400", text: "text-white", dot: "bg-cyan-400" },
  { bg: "bg-violet-400/60", border: "border-l-violet-400", text: "text-white", dot: "bg-violet-400" },
  { bg: "bg-rose-400/60", border: "border-l-rose-400", text: "text-white", dot: "bg-rose-400" },
  { bg: "bg-sky-400/60", border: "border-l-sky-400", text: "text-white", dot: "bg-sky-400" },
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
    const times = Array.from({ length: 24 * 4 }, (_, i) => {
      const h = Math.floor(i / 4).toString().padStart(2, "0");
      const m = ((i % 4) * 15).toString().padStart(2, "0");
      return `${h}:${m}`;
    });

    // Add current time if it's not a multiple of 15
    const currentTime = format(dateObj, "HH:mm");
    if (!times.includes(currentTime)) {
      times.push(currentTime);
    }

    return times.sort((a, b) => a.localeCompare(b));
  }, [dateObj]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const activeItem = scrollRef.current?.querySelector("[data-active='true']");
        if (activeItem) {
          activeItem.scrollIntoView({ block: "center", behavior: "instant" });
        }
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
                type="search"
                name={`time_${Math.random().toString(36).slice(2, 7)}`}
                id={`time_${Math.random().toString(36).slice(2, 7)}`}
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore
                value={tempTime}
                onFocus={(e) => {
                  setIsOpen(true);
                  e.currentTarget.select();
                }}
                onMouseDown={(e) => {
                  // Prevent the click from triggering a blur-then-refocus cycle
                  if (document.activeElement === e.currentTarget) {
                    e.preventDefault();
                    if (!isOpen) setIsOpen(true);
                  }
                }}
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
                className="bg-transparent border-none p-0 tabular-nums font-bold text-teal-400 text-sm w-12 focus:ring-0 focus:outline-none placeholder:text-teal-900 cursor-text [appearance:none] [&::-webkit-search-cancel-button]:hidden"
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
  initialRdv,
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
    assigned_to: [] as string[],
    google_calendar: [] as string[],
    unassigned: false,
    start_time: "",
    end_time: "",
    location: DEFAULT_LOCATION,
    description: "",
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll preview to current context
  useEffect(() => {
    let timers: NodeJS.Timeout[] = [];

    if (open) {
      const applyScroll = () => {
        if (!previewScrollRef.current) return;

        // Force base scroll precisely to 06:00 AM (6 * 40 = 240px)
        const targetTop = 6 * PREVIEW_HOUR_HEIGHT;
        previewScrollRef.current.scrollTop = targetTop;
      };

      // Staggered execution guarantees it applies during and after the dialog's entry animation
      timers = [
        setTimeout(applyScroll, 0),
        setTimeout(applyScroll, 100),
        setTimeout(applyScroll, 300)
      ];
    }

    return () => timers.forEach(clearTimeout);
  }, [open]);

  // Auto-resize notes textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [form.description]);

  const [clientSearch, setClientSearch] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const s = clientSearch.toLowerCase();
    return clients.filter(c => c.label.toLowerCase().includes(s));
  }, [clients, clientSearch]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === form.client_id);
  }, [clients, form.client_id]);

  const getCalendarLabel = (id: string) => {
    if (id.includes("@group.calendar.google.com")) return "Attilio";
    if (id.includes("mael")) return "Maël";
    if (id.includes("#holiday@group.v.calendar.google.com")) return "Jours fériés";
    const namePart = id.split("@")[0];
    return namePart
      .split(".")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const validUsers = useMemo(() => {
    return calendarIds.map((cid, idx) => {
      // Try to find a profile whose email matches the calendar ID (for individuals)
      // Otherwise, fallback to the profile at the same index
      const foundProfile = profiles.find(p => p.email && cid.toLowerCase().includes(p.email.toLowerCase()))
        || profiles[idx];

      if (!foundProfile) return null;

      return {
        profile: foundProfile,
        calendarId: cid
      };
    }).filter(Boolean) as { profile: Profile; calendarId: string }[];
  }, [profiles, calendarIds]);

  useEffect(() => {
    if (open && validUsers.length > 0) {
      if (initialRdv) {
        setForm({
          title: initialRdv.title,
          client_id: initialRdv.client_id || "",
          assigned_to: initialRdv.assigned_to ? [initialRdv.assigned_to] : [],
          google_calendar: [],
          unassigned: !initialRdv.assigned_to,
          start_time: format(parseISO(initialRdv.start_time), "yyyy-MM-dd'T'HH:mm"),
          end_time: format(parseISO(initialRdv.end_time), "yyyy-MM-dd'T'HH:mm"),
          location: initialRdv.location || DEFAULT_LOCATION,
          description: initialRdv.description || "",
        });
        setPreviewDate(parseISO(initialRdv.start_time));
      } else {
        const defaults = getDefaults();
        setForm({
          title: "",
          client_id: defaultClientId || "",
          assigned_to: [],
          google_calendar: [],
          unassigned: false,
          start_time: defaults.start,
          end_time: defaults.end,
          location: DEFAULT_LOCATION,
          description: "",
        });
        setPreviewDate(new Date());
      }
      setClientEmail("");
      setClientHasEmail(true);
    }
  }, [open, validUsers, defaultClientId, initialRdv]);

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
  const uniqueCalIds = useMemo(() => {
    const ids = [...new Set(googleEvents.map((e) => e.calendarId))];
    if (form.unassigned || form.google_calendar.length === 0) return ids;
    return ids.filter(id => form.google_calendar.includes(id));
  }, [googleEvents, form.unassigned, form.google_calendar]);

  const calColors = useMemo(
    () => Object.fromEntries(calendarIds.map((id, i) => [id, CALENDAR_COLORS[i % CALENDAR_COLORS.length]])),
    [calendarIds]
  );

  const previewHours = useMemo(() => Array.from({ length: PREVIEW_TOTAL_HOURS }, (_, i) => PREVIEW_HOUR_START + i), []);

  const dayEvents = useMemo(() => googleEvents.filter((e) => {
    if (e.allDay || !isSameDay(parseISO(e.start), previewDate)) return false;
    if (form.unassigned || form.google_calendar.length === 0) return true;
    return form.google_calendar.includes(e.calendarId);
  }), [googleEvents, previewDate, form.unassigned, form.google_calendar]);

  const dayRdvs = useMemo(() => rdvs.filter((r) => {
    if (!isSameDay(parseISO(r.start_time), previewDate)) return false;
    if (form.unassigned || form.assigned_to.length === 0) return true;
    return r.assigned_to && form.assigned_to.includes(r.assigned_to);
  }), [rdvs, previewDate, form.unassigned, form.assigned_to]);

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

    let error = null;

    if (initialRdv) {
      // Logic: if it was "termine" but moved to the future, reset to "planifie"
      const now = new Date();
      const newStart = new Date(startISO);
      const shouldResetStatus = initialRdv.status === "termine" && newStart > now;
      const statusToSet = shouldResetStatus ? "planifie" : undefined;

      const { error: err } = await supabase
        .from("rendez_vous")
        .update({
          title: form.title,
          client_id: form.client_id || null,
          assigned_to: form.unassigned ? null : (form.assigned_to[0] || null),
          start_time: startISO,
          end_time: endISO,
          location: form.location || null,
          description: form.description || null,
          ...(statusToSet ? { status: statusToSet } : {}),
        })
        .eq("id", initialRdv.id);
      error = err;

      // Sync with Google Calendar if it's already linked
      if (!error && initialRdv.google_event_id && initialRdv.google_calendar_id) {
        try {
          await fetch("/api/calendar/events", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              calendarId: initialRdv.google_calendar_id,
              eventId: initialRdv.google_event_id,
              title: form.title,
              start: startISO,
              end: endISO,
              location: form.location || null,
              description: form.description || null,
              ...(shouldResetStatus ? { colorId: "1" } : {}), // Reset color to Blue if moved to future
            }),
          });
        } catch (err) {
          console.error("GCal edit sync failed:", err);
        }
      }
    } else {
      const { error: err } = await supabase.from("rendez_vous").insert({
        title: form.title,
        client_id: form.client_id || null,
        assigned_to: form.unassigned ? null : (form.assigned_to[0] || null), // Null if unassigned
        start_time: startISO,
        end_time: endISO,
        location: form.location || null,
        description: form.description || null,
        created_by: user?.id,
      });
      error = err;

      // Google Calendar Creation (only for new RDVs)
      if (!error && !form.unassigned) {
        let savedEventId: string | null = null;
        let savedCalId: string | null = null;

        await Promise.all(form.google_calendar.map(async (calendarId) => {
          try {
            const gRes = await fetch("/api/calendar/events", {
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
            if (gRes.ok) {
              const data = await gRes.json();
              if (!savedEventId) {
                savedEventId = data.eventId;
                savedCalId = calendarId;
              }
            }
          } catch { /* Silent fail */ }
        }));

        if (savedEventId) {
          const { data: latest } = await supabase
            .from("rendez_vous")
            .select("id")
            .eq("created_by", user?.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          
          if (latest) {
            await supabase
              .from("rendez_vous")
              .update({ google_event_id: savedEventId, google_calendar_id: savedCalId })
              .eq("id", latest.id);
          }
        }
      }
    }

    // --- Common actions for both New and Update ---
    if (!error && !form.unassigned) {
      const emailToUse = clientEmail.trim();
      
      // Update client email if entered manually
      if (form.client_id && emailToUse && !clientHasEmail) {
        await supabase
          .from("clients")
          .update({ email: emailToUse })
          .eq("id", form.client_id);
      }

      // Send Email Notification
      if (form.client_id && emailToUse) {
        try {
          const { data: clientData } = await supabase
            .from("clients")
            .select("first_name, last_name")
            .eq("id", form.client_id)
            .single();
          
          if (clientData) {
            const assignedProfile = profiles.find((p) => p.id === form.assigned_to[0]);
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
                isUpdate: !!initialRdv,
              }),
            });
          }
        } catch (err) {
          console.error("Email notification failed:", err);
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
          // On avance la fin à start + 30 minutes (le décalage par défaut)
          next.end_time = format(addMinutes(s, 30), "yyyy-MM-dd'T'HH:mm");
        }
      }

      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700/60 text-slate-200 sm:max-w-4xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold text-white">
            {initialRdv ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
          </DialogTitle>
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

            {/* Assigné à & Lieu Row */}
            <div className="grid md:grid-cols-2 gap-3 items-start">
              {/* Assigné à (Horizontal Toggle List) */}
              <div className="space-y-3 min-w-0">
                <Label className="text-xs font-medium text-slate-400">Assigné à *</Label>
                <div className="flex flex-wrap gap-4">
                  {/* Option "À définir" */}
                  <button
                    key="unassigned"
                    type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, unassigned: !f.unassigned, assigned_to: [], google_calendar: [] }));
                    }}
                    className="group flex flex-col items-center gap-2 outline-none"
                  >
                    <div className={cn(
                      "relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-200 shadow-lg",
                      form.unassigned
                        ? "border-amber-500 bg-amber-500/10 scale-110 ring-4 ring-amber-500/10"
                        : "border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-700/80"
                    )}>
                      <HelpCircle className={cn(
                        "h-6 w-6 transition-colors",
                        form.unassigned ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200"
                      )} />
                      {form.unassigned && (
                        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white border-2 border-slate-900">
                          <Check className="h-3 w-3 bold" />
                        </div>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium transition-colors",
                      form.unassigned ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"
                    )}>
                      À définir
                    </span>
                  </button>

                  {validUsers.map((item) => {
                    const p = item.profile;
                    const calendarId = item.calendarId;
                    const isSelected = form.assigned_to.includes(p.id);
                    const label = getCalendarLabel(calendarId);
                    const initials = p.full_name
                      ? p.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                      : p.email?.split("@")[0].charAt(0).toUpperCase() || "??";

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setForm(f => {
                            const isCurrentlySelected = f.assigned_to.includes(p.id);
                            const newAssignedTo = isCurrentlySelected
                              ? f.assigned_to.filter(id => id !== p.id)
                              : [...f.assigned_to, p.id];
                            const newGoogleCalendar = isCurrentlySelected
                              ? f.google_calendar.filter(id => id !== calendarId)
                              : [...f.google_calendar, calendarId];

                            return { ...f, unassigned: false, assigned_to: newAssignedTo, google_calendar: newGoogleCalendar };
                          });
                        }}
                        className="group flex flex-col items-center gap-2 outline-none"
                      >
                        <div className={cn(
                          "relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-200 shadow-lg",
                          isSelected
                            ? "border-teal-500 bg-teal-500/10 scale-110 ring-4 ring-teal-500/10"
                            : "border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-700/80"
                        )}>
                          <span className={cn(
                            "text-sm font-bold",
                            isSelected ? "text-teal-400" : "text-slate-400 group-hover:text-slate-200"
                          )}>
                            {initials}
                          </span>
                          {isSelected && (
                            <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-white border-2 border-slate-900">
                              <Check className="h-3 w-3 bold" />
                            </div>
                          )}
                        </div>
                        <span className={cn(
                          "text-[10px] font-medium transition-colors",
                          isSelected ? "text-teal-400" : "text-slate-500 group-hover:text-slate-300"
                        )}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lieu (Stylisé) */}
              <div className="space-y-3 min-w-0 flex flex-col">
                <Label className="text-xs font-medium text-slate-400">Lien ou lieu du rendez-vous</Label>
                <div className="relative group flex items-center">
                  <div className="absolute left-1.5 h-8 w-8 rounded-lg bg-slate-800/80 flex items-center justify-center border border-slate-700/50 shadow-sm transition-colors group-focus-within:border-teal-500/30 group-focus-within:text-teal-400 text-slate-400 z-10 pointer-events-none">
                    {form.location?.startsWith("http") ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                  </div>
                  <Input
                    placeholder="Visio, Bureau, Lien Jitsi..."
                    value={form.location || ""}
                    onChange={(e) => update("location", e.target.value)}
                    className={cn(inputClass, "mt-0 pl-11 pr-20 h-11 rounded-xl bg-slate-900/40 border-slate-700/60 transition-all hover:bg-slate-900/60 focus:bg-slate-900")}
                  />
                  {form.location && (
                    <div className="absolute right-1.5 flex items-center gap-0.5 z-10">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 rounded-md bg-slate-900/50"
                        onClick={() => navigator.clipboard.writeText(form.location)}
                        title="Copier le texte"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {form.location.startsWith("http") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 rounded-md bg-slate-900/50"
                          onClick={() => window.open(form.location, "_blank")}
                          title="Ouvrir le lien"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Client (Recherche interactive) */}
            <div className="relative space-y-1.5">
              <Label className="text-xs font-medium text-slate-400">Client</Label>

              {!form.client_id ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    type="search"
                    name={`client_${Math.random().toString(36).slice(2, 7)}`}
                    id={`client_${Math.random().toString(36).slice(2, 7)}`}
                    placeholder="Chercher par nom, email ou société..."
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientResults(true);
                    }}
                    onFocus={() => setShowClientResults(true)}
                    onMouseDown={(e) => {
                      if (document.activeElement === e.currentTarget) {
                        e.preventDefault();
                        if (!showClientResults) setShowClientResults(true);
                      }
                    }}
                    className={cn(inputClass, "pl-10 h-11 [appearance:none] [&::-webkit-search-cancel-button]:hidden")}
                  />
                  {clientSearch && (
                    <button
                      type="button"
                      onClick={() => setClientSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {/* Dropdown de résultats */}
                  {showClientResults && (clientSearch || filteredClients.length > 0) && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowClientResults(false)}
                      />
                      <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto custom-scrollbar overflow-x-hidden">
                        {filteredClients.length > 0 ? (
                          <div className="p-1">
                            {filteredClients.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  update("client_id", c.id);
                                  setClientSearch("");
                                  setShowClientResults(false);
                                }}
                                className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors group flex items-center"
                              >
                                <span className="text-sm font-medium text-slate-300 group-hover:text-white truncate">
                                  {c.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <p className="text-sm text-slate-500">Aucun client trouvé</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl group transition-all hover:bg-teal-500/15">
                  <div className="h-10 w-10 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
                    <span className="text-teal-400 font-bold">
                      {selectedClient?.label.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-teal-300 truncate">{selectedClient?.label}</p>
                    <p className="text-[10px] text-teal-500/70 uppercase tracking-wider font-medium">Client sélectionné</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => update("client_id", "")}
                    className="p-2 hover:bg-teal-500/20 rounded-lg text-teal-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
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



            {/* Notes */}
            <div>
              <Label className="text-xs font-medium text-slate-400">Notes</Label>
              <Textarea
                ref={textareaRef}
                placeholder="Informations complémentaires..."
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className={`mt-1.5 bg-slate-900/60 border-slate-700/60 text-slate-200 placeholder:text-slate-600 focus-visible:border-teal-500/50 focus-visible:ring-teal-500/20 resize-none overflow-hidden min-h-[80px] transition-[height] duration-100 ease-out`}
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
                  initialRdv ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                )}
                {loading ? (initialRdv ? "Mise à jour..." : "Création...") : (initialRdv ? "Enregistrer" : "Créer le RDV")}
              </Button>
            </div>
          </form>

          {/* ── Right: Day Preview ── */}
          <div className="w-[300px] shrink-0 flex flex-col min-h-0 bg-slate-950/20 p-6 space-y-4">
            <div className="flex flex-col flex-1 min-h-0 bg-slate-900/50 rounded-2xl border border-slate-700/50 shadow-inner overflow-hidden">
              {/* Day nav */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/60 shrink-0 bg-slate-950/40">
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
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700/40 shrink-0 bg-slate-950/20">
                  {uniqueCalIds.map((id) => (
                    <div key={id} className="flex items-center gap-1">
                      <div className={cn("h-1.5 w-1.5 rounded-full", (calColors[id] || CALENDAR_COLORS[0]).text?.replace("text-", "bg-"))} />
                      <span className="text-[9px] text-slate-500">{getCalendarLabel(id)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Day grid */}
              <div ref={previewScrollRef} className="flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: `${14 * PREVIEW_HOUR_HEIGHT}px` }}>
                <div className="relative">
                  {previewHours.map((h) => (
                    <div key={h} className="flex border-b border-slate-800/60 group" style={{ height: `${PREVIEW_HOUR_HEIGHT}px` }}>
                      <div className="w-11 shrink-0 bg-slate-950/20 border-r border-slate-800/40 flex items-start justify-end pr-2 pt-0.5">
                        <span className="text-[9px] text-slate-500 font-medium tabular-nums">
                          {h.toString().padStart(2, "0")}:00
                        </span>
                      </div>
                      <div className="flex-1 group-hover:bg-slate-800/10 transition-colors" />
                    </div>
                  ))}

                  {/* Existing Google events */}
                  {dayEvents.map((event) => {
                    const style = getBlockStyle(event.start, event.end);
                    const colors = calColors[event.calendarId] || CALENDAR_COLORS[0];
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "absolute left-10 right-3 rounded px-1.5 py-0.5 overflow-hidden border-l-2",
                          colors?.bg, colors?.border
                        )}
                        style={style}
                      >
                        <p className={cn("text-[10px] font-bold truncate leading-tight", colors?.text)}>{event.title}</p>
                        <p className="text-[9px] text-white truncate">
                          {format(parseISO(event.start), "HH:mm")}–{format(parseISO(event.end), "HH:mm")}
                        </p>
                      </div>
                    );
                  })}

                  {/* Existing Pipeline RDVs */}
                  {dayRdvs.map((rdv) => {
                    if (initialRdv && rdv.id === initialRdv.id) return null;
                    const style = getBlockStyle(rdv.start_time, rdv.end_time);
                    return (
                      <div
                        key={rdv.id}
                        className="absolute left-10 right-3 rounded px-1.5 py-0.5 overflow-hidden border-l-[3px] bg-red-500/25 border-red-500/40 border-l-red-500"
                        style={style}
                      >
                        <p className="text-[10px] font-bold text-white truncate leading-tight">{rdv.title}</p>
                        <p className="text-[9px] text-white/60 truncate">
                          {format(parseISO(rdv.start_time), "HH:mm")}–{format(parseISO(rdv.end_time), "HH:mm")}
                        </p>
                      </div>
                    );
                  })}

                  {/* New RDV overlay */}
                  {newRdvOverlay && (
                    <div
                      className="absolute left-10 right-3 rounded px-1.5 py-0.5 overflow-hidden border-l-[3px] bg-red-500/40 border-red-500/60 border-l-red-500 z-10 shadow-lg"
                      style={newRdvOverlay}
                    >
                      <p className="text-[10px] font-bold text-white truncate leading-tight">
                        {form.title || (initialRdv ? "Modification" : "Nouveau RDV")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
