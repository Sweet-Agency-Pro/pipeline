"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Building2,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  addDays,
  startOfWeek,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  differenceInMinutes,
  isWeekend,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { Profile, RendezVous, GoogleCalendarEvent, RdvStatus } from "@/types";
import { RDV_STATUS_CONFIG } from "@/types";
import { cn } from "@/lib/utils";
import { NouveauRdvDialog } from "./nouveau-rdv-dialog";
import { RdvDetailDialog } from "./rdv-detail-dialog";

const HOUR_START = 7;
const HOUR_END = 21;
const HOUR_HEIGHT = 56;
const TOTAL_HOURS = HOUR_END - HOUR_START;

const CALENDAR_COLORS = [
  { bg: "bg-amber-400/10", border: "border-l-amber-400", text: "text-amber-300", dot: "bg-amber-400" },
  { bg: "bg-violet-400/10", border: "border-l-violet-400", text: "text-violet-300", dot: "bg-violet-400" },
  { bg: "bg-rose-400/10", border: "border-l-rose-400", text: "text-rose-300", dot: "bg-rose-400" },
  { bg: "bg-sky-400/10", border: "border-l-sky-400", text: "text-sky-300", dot: "bg-sky-400" },
];

// ── Collision layout (Google Calendar-style side-by-side) ──
interface LayoutItem {
  id: string;
  startMin: number;
  endMin: number;
}

interface LayoutResult {
  col: number;
  totalCols: number;
}

function computeCollisionLayout(items: LayoutItem[]): Map<string, LayoutResult> {
  if (items.length === 0) return new Map();

  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));
  const result = new Map<string, LayoutResult>();

  // Assign each event to the first available column
  const columns: LayoutItem[][] = [];
  for (const item of sorted) {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const lastInCol = columns[c][columns[c].length - 1];
      if (lastInCol.endMin <= item.startMin) {
        columns[c].push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([item]);
    }
  }

  // Build a map of column index per item
  const colMap = new Map<string, number>();
  columns.forEach((col, ci) => col.forEach((item) => colMap.set(item.id, ci)));

  // For each item, find the max columns among all items it overlaps with
  for (const item of sorted) {
    const col = colMap.get(item.id)!;
    // Find all items overlapping with this one
    let maxCol = col;
    for (const other of sorted) {
      if (other.startMin < item.endMin && other.endMin > item.startMin) {
        maxCol = Math.max(maxCol, colMap.get(other.id)!);
      }
    }
    result.set(item.id, { col, totalCols: maxCol + 1 });
  }

  // Expand totalCols so all overlapping items share the same totalCols
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of sorted) {
      const layout = result.get(item.id)!;
      for (const other of sorted) {
        if (other.startMin < item.endMin && other.endMin > item.startMin) {
          const otherLayout = result.get(other.id)!;
          const maxTotal = Math.max(layout.totalCols, otherLayout.totalCols);
          if (layout.totalCols !== maxTotal) { layout.totalCols = maxTotal; changed = true; }
          if (otherLayout.totalCols !== maxTotal) { otherLayout.totalCols = maxTotal; changed = true; }
        }
      }
    }
  }

  return result;
}

interface CalendrierClientProps {
  profiles: Profile[];
  clients: { id: string; label: string }[];
  calendarIds: string[];
}

export function CalendrierClient({ profiles, clients, calendarIds }: CalendrierClientProps) {
  const supabase = createClient();
  const gridRef = useRef<HTMLDivElement>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRdv, setShowNewRdv] = useState(false);
  const [selectedRdv, setSelectedRdv] = useState<RendezVous | null>(null);

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const hours = useMemo(() => Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i), []);

  // Scroll to 8h on mount
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = HOUR_HEIGHT; // 1 hour offset (7→8)
    }
  }, []);

  const loadRdvs = useCallback(async () => {
    const { data } = await supabase
      .from("rendez_vous")
      .select("*, client:clients(id, first_name, last_name, company), assigned_profile:profiles!rendez_vous_assigned_to_fkey(*)")
      .gte("start_time", weekStart.toISOString())
      .lte("start_time", weekEnd.toISOString())
      .order("start_time");
    if (data) setRdvs(data as RendezVous[]);
  }, [supabase, weekStart, weekEnd]);

  const loadGoogleEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar/availability?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`);
      if (res.ok) {
        const { events } = await res.json();
        if (events) {
          const all: GoogleCalendarEvent[] = [];
          for (const [calId, calEvents] of Object.entries(events)) {
            for (const event of calEvents as GoogleCalendarEvent[]) {
              all.push({ ...event, calendarId: calId });
            }
          }
          setGoogleEvents(all);
        }
      }
    } catch {
      /* API not configured */
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    loadRdvs();
    loadGoogleEvents();
  }, [loadRdvs, loadGoogleEvents]);

  // Navigation
  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => setCurrentDate(addDays(currentDate, -7));
  const goNext = () => setCurrentDate(addDays(currentDate, 7));
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Callbacks
  const handleRdvCreated = () => { setShowNewRdv(false); loadRdvs(); };
  const handleRdvUpdated = () => { setSelectedRdv(null); loadRdvs(); };

  // Helpers
  const getEventsForDay = (day: Date) => googleEvents.filter((e) => {
    if (e.allDay || !isSameDay(parseISO(e.start), day)) return false;
    // Skip Google events that duplicate a Pipeline RDV (same title + same start)
    return !rdvs.some((r) => r.title === e.title && parseISO(r.start_time).getTime() === parseISO(e.start).getTime());
  });
  const getRdvsForDay = (day: Date) => rdvs.filter((r) => isSameDay(parseISO(r.start_time), day));

  const getBlockStyle = (startStr: string, endStr: string) => {
    const s = parseISO(startStr);
    const e = parseISO(endStr);
    const topMin = (s.getHours() - HOUR_START) * 60 + s.getMinutes();
    const dur = differenceInMinutes(e, s);
    return { top: `${(topMin / 60) * HOUR_HEIGHT}px`, height: `${Math.max((dur / 60) * HOUR_HEIGHT, 18)}px` };
  };

  // Color map
  const uniqueCalIds = useMemo(() => [...new Set(googleEvents.map((e) => e.calendarId))], [googleEvents]);
  const calColors = useMemo(
    () => Object.fromEntries(uniqueCalIds.map((id, i) => [id, CALENDAR_COLORS[i % CALENDAR_COLORS.length]])),
    [uniqueCalIds]
  );

  // Current time indicator
  const now = new Date();
  const nowMinutes = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
  const showNowLine = nowMinutes >= 0 && nowMinutes <= TOTAL_HOURS * 60;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* ── Header Bar ── */}
      <div className="shrink-0 flex items-center justify-between px-1 pb-4">
        <div className="flex items-center gap-5">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Calendrier</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={goPrev} className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/60">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToday}
              className={cn("h-8 px-3 text-xs font-medium", isCurrentWeek ? "text-slate-500" : "text-teal-400 hover:text-teal-300 hover:bg-teal-500/10")}
              disabled={isCurrentWeek}
            >
              Aujourd&apos;hui
            </Button>
            <Button variant="ghost" size="icon" onClick={goNext} className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/60">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm text-slate-400 font-medium capitalize">
            {format(weekStart, "MMMM yyyy", { locale: fr })}
          </span>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-500">
            {uniqueCalIds.map((id) => (
              <div key={id} className="flex items-center gap-1.5">
                <div className={cn("h-2 w-2 rounded-full", calColors[id].dot)} />
                <span>{id.split("@")[0]}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-teal-400" />
              <span>RDV</span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setShowNewRdv(true)}
            className="h-8 bg-teal-500 text-white hover:bg-teal-600 border-0 shadow-sm shadow-teal-500/20"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nouveau RDV
          </Button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 min-h-0">

        {/* ── Week Grid ── */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 backdrop-blur-sm overflow-hidden flex flex-col min-h-0">
          {/* Day headers */}
          <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-slate-700/60 shrink-0">
            <div className="border-r border-slate-700/40" />
            {weekDays.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "py-2.5 text-center",
                  i < 6 && "border-r border-slate-700/40",
                  isWeekend(day) && "bg-slate-800/30"
                )}
              >
                <div className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
                  {format(day, "EEE", { locale: fr })}
                </div>
                <div className={cn(
                  "text-sm font-semibold mt-0.5",
                  isToday(day) ? "bg-teal-500 text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto" : "text-slate-300"
                )}>
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable grid */}
          <div ref={gridRef} className="flex-1 overflow-y-auto overflow-x-auto scrollbar-hide">
            <div className="grid grid-cols-[48px_repeat(7,1fr)] min-w-[660px]">
              {/* Time gutter */}
              <div className="border-r border-slate-700/40">
                {hours.map((h) => (
                  <div key={h} className="h-[56px] flex items-start justify-end pr-2 pt-0">
                    <span className="text-[10px] font-medium text-slate-600 -mt-1.5 tabular-nums">{`${h.toString().padStart(2, "0")}:00`}</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, dayIdx) => {
                const dayEvents = getEventsForDay(day);
                const dayRdvs = getRdvsForDay(day);
                const todayCol = isToday(day);

                // Build unified layout items for collision detection
                const layoutItems: LayoutItem[] = [
                  ...dayEvents.map((e) => {
                    const s = parseISO(e.start);
                    const end = parseISO(e.end);
                    return { id: `ge-${e.id}`, startMin: (s.getHours() - HOUR_START) * 60 + s.getMinutes(), endMin: (end.getHours() - HOUR_START) * 60 + end.getMinutes() };
                  }),
                  ...dayRdvs.map((r) => {
                    const s = parseISO(r.start_time);
                    const end = parseISO(r.end_time);
                    return { id: `rdv-${r.id}`, startMin: (s.getHours() - HOUR_START) * 60 + s.getMinutes(), endMin: (end.getHours() - HOUR_START) * 60 + end.getMinutes() };
                  }),
                ];
                const collisions = computeCollisionLayout(layoutItems);

                const PAD = 2; // px padding between columns
                const getColStyle = (layoutId: string) => {
                  const layout = collisions.get(layoutId);
                  if (!layout || layout.totalCols <= 1) return { left: "4px", right: "4px" };
                  const widthPct = 100 / layout.totalCols;
                  return {
                    left: `calc(${layout.col * widthPct}% + ${PAD}px)`,
                    width: `calc(${widthPct}% - ${PAD * 2}px)`,
                  };
                };

                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      "relative",
                      dayIdx < 6 && "border-r border-slate-700/40",
                      isWeekend(day) && "bg-slate-800/15"
                    )}
                  >
                    {/* Hour rows */}
                    {hours.map((h) => (
                      <div key={h} className="h-[56px] border-b border-slate-700/20" />
                    ))}

                    {/* Now indicator */}
                    {todayCol && showNowLine && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: `${(nowMinutes / 60) * HOUR_HEIGHT}px` }}
                      >
                        <div className="flex items-center">
                          <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-[5px] shadow-sm shadow-red-500/40" />
                          <div className="flex-1 h-[1.5px] bg-red-500/70" />
                        </div>
                      </div>
                    )}

                    {/* Google Calendar events */}
                    {dayEvents.map((event) => {
                      const style = { ...getBlockStyle(event.start, event.end), ...getColStyle(`ge-${event.id}`) };
                      const colors = calColors[event.calendarId];
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "absolute rounded-md px-1.5 py-1 overflow-hidden border-l-[3px] transition-opacity",
                            colors?.bg, colors?.border
                          )}
                          style={style}
                          title={`${event.title}${event.location ? ` — ${event.location}` : ""}`}
                        >
                          <p className={cn("text-[11px] font-medium truncate leading-tight", colors?.text)}>
                            {event.title}
                          </p>
                          <p className="text-[10px] text-slate-500/80 truncate">
                            {format(parseISO(event.start), "HH:mm")} – {format(parseISO(event.end), "HH:mm")}
                          </p>
                        </div>
                      );
                    })}

                    {/* Pipeline RDVs */}
                    {dayRdvs.map((rdv) => {
                      const style = { ...getBlockStyle(rdv.start_time, rdv.end_time), ...getColStyle(`rdv-${rdv.id}`) };
                      return (
                        <div
                          key={rdv.id}
                          onClick={() => setSelectedRdv(rdv)}
                          className="absolute rounded-md px-1.5 py-1 cursor-pointer overflow-hidden border-l-[3px] bg-teal-500/12 border-l-teal-400 hover:bg-teal-500/20 transition-all z-[1]"
                          style={style}
                          title={rdv.title}
                        >
                          <p className="text-[11px] font-medium text-teal-300 truncate leading-tight">
                            {rdv.title}
                          </p>
                          <p className="text-[10px] text-slate-500/80 truncate">
                            {format(parseISO(rdv.start_time), "HH:mm")} – {format(parseISO(rdv.end_time), "HH:mm")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="flex flex-col min-h-0">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Rendez-vous · {format(weekStart, "d", { locale: fr })}–{format(weekEnd, "d MMM", { locale: fr })}
          </h2>

          {rdvs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-slate-700/60 bg-slate-900/20">
              <div className="text-center py-12">
                <CalendarIcon className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Aucun RDV cette semaine</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
              {rdvs.map((rdv) => {
                const conf = RDV_STATUS_CONFIG[rdv.status as RdvStatus];
                const client = rdv.client as { first_name: string; last_name: string; company?: string } | undefined;
                return (
                  <div
                    key={rdv.id}
                    onClick={() => setSelectedRdv(rdv)}
                    className="group rounded-lg border border-slate-700/50 bg-slate-800/40 p-3 cursor-pointer hover:bg-slate-800/70 hover:border-slate-600/60 transition-all"
                  >
                    {/* Title + Badge */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="text-[13px] font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                        {rdv.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={cn("text-[10px] px-1.5 py-0 h-[18px] border-0", conf.bgColor, conf.color)}>
                          {conf.label}
                        </Badge>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm("Supprimer ce rendez-vous ?")) return;
                            try {
                              await fetch("/api/calendar/events", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ title: rdv.title, start: rdv.start_time }),
                              });
                            } catch {}
                            await supabase.from("rendez_vous").delete().eq("id", rdv.id);
                            loadRdvs();
                          }}
                          className="opacity-0 group-hover:opacity-100 h-[18px] w-[18px] flex items-center justify-center rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>
                          {format(parseISO(rdv.start_time), "EEE d · HH:mm", { locale: fr })} – {format(parseISO(rdv.end_time), "HH:mm")}
                        </span>
                      </div>
                      {rdv.assigned_profile && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{rdv.assigned_profile.full_name}</span>
                        </div>
                      )}
                      {client && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {client.first_name} {client.last_name}
                            {client.company ? ` · ${client.company}` : ""}
                          </span>
                        </div>
                      )}
                      {rdv.location && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{rdv.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      <NouveauRdvDialog
        open={showNewRdv}
        onClose={() => setShowNewRdv(false)}
        onCreated={handleRdvCreated}
        profiles={profiles}
        clients={clients}
        calendarIds={calendarIds}
      />
      {selectedRdv && (
        <RdvDetailDialog
          rdv={selectedRdv}
          open={!!selectedRdv}
          onClose={() => setSelectedRdv(null)}
          onUpdated={handleRdvUpdated}
          profiles={profiles}
        />
      )}
    </div>
  );
}
