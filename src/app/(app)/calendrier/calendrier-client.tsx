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
  Menu,
  Search,
  HelpCircle,
  Settings,
  Grid as AppGrid,
  ChevronDown,
  Users,
  Eye,
  EyeOff,
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

const HOUR_START = 0;
const HOUR_END = 24;
const HOUR_HEIGHT = 56;
const TOTAL_HOURS = HOUR_END - HOUR_START;

const CALENDAR_COLORS = [
  { bg: "bg-cyan-400/60", border: "border-l-cyan-400", text: "text-white", dot: "bg-cyan-400" },
  { bg: "bg-violet-400/60", border: "border-l-violet-400", text: "text-white", dot: "bg-violet-400" },
  { bg: "bg-rose-400/60", border: "border-l-rose-400", text: "text-white", dot: "bg-rose-400" },
  { bg: "bg-sky-400/60", border: "border-l-sky-400", text: "text-white", dot: "bg-sky-400" },
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

function MiniCalendar({ viewDate, selectedDate, onDateClick, onViewDateChange }: { viewDate: Date, selectedDate: Date, onDateClick: (d: Date) => void, onViewDateChange: (d: Date) => void }) {
  const monthStart = startOfWeek(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1), { weekStartsOn: 1 });
  const days = Array.from({ length: 42 }, (_, i) => addDays(monthStart, i));

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-sm font-medium text-slate-200 capitalize" style={{ minWidth: "100px" }}>
          {format(viewDate, "MMMM yyyy", { locale: fr })}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer active:scale-95 transition-all" onClick={() => onViewDateChange(addDays(viewDate, -28))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer active:scale-95 transition-all" onClick={() => onViewDateChange(addDays(viewDate, 28))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 mb-1 px-1">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="text-[10px] font-medium text-slate-500 text-center w-6 h-6 flex items-center justify-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 px-1">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === viewDate.getMonth();
          const isTodayDay = isToday(day);
          const isSel = isSameDay(day, selectedDate);
          return (
            <div
              key={i}
              onClick={() => onDateClick(day)}
              className={cn(
                "text-xs w-7 h-7 flex items-center justify-center rounded-full cursor-pointer mx-auto transition-all duration-200",
                isSel ? "bg-[#1e293b] text-teal-400 font-bold border border-teal-500/30" :
                  isTodayDay ? "bg-teal-500/20 text-teal-400 font-semibold hover:bg-teal-500/30" :
                    (isCurrentMonth ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-800/40")
              )}
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CalendrierClientProps {
  profiles: Profile[];
  clients: { id: string; label: string }[];
  calendarIds: string[];
}

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

export function CalendrierClient({ profiles, clients, calendarIds }: CalendrierClientProps) {
  const supabase = createClient();
  const gridRef = useRef<HTMLDivElement>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [miniCalDate, setMiniCalDate] = useState(new Date());
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRdv, setShowNewRdv] = useState(false);
  const [selectedRdv, setSelectedRdv] = useState<RendezVous | null>(null);
  const [expandedAgendas, setExpandedAgendas] = useState(true);
  const [expandedUpcoming, setExpandedUpcoming] = useState(true);
  const [hoverTooltip, setHoverTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [hiddenCalendarIds, setHiddenCalendarIds] = useState<string[]>([]);

  const toggleCalendarVisibility = (id: string) => {
    setHiddenCalendarIds(prev => 
      prev.includes(id) ? prev.filter(hid => hid !== id) : [...prev, id]
    );
  };

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const hours = useMemo(() => Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i), []);

  // Scroll to 8h on mount
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = 5 * HOUR_HEIGHT; // Scroll to 5 AM
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
  const getEventsForDay = (day: Date) => {
    const dStart = new Date(day); dStart.setHours(0, 0, 0, 0);
    const dEnd = new Date(day); dEnd.setHours(23, 59, 59, 999);
    return googleEvents.filter((e) => {
      if (hiddenCalendarIds.includes(e.calendarId)) return false;
      if (e.allDay) return false;
      const s = parseISO(e.start);
      const end = parseISO(e.end);
      if (!(s < dEnd && end > dStart)) return false;
      // Skip Google events that duplicate a Pipeline RDV (same title + same start)
      return !rdvs.some((r) => r.title === e.title && parseISO(r.start_time).getTime() === parseISO(e.start).getTime());
    });
  };

  const getAllDayEventsForDay = (day: Date) => {
    const dStart = new Date(day); dStart.setHours(0, 0, 0, 0);
    const dEnd = new Date(day); dEnd.setHours(23, 59, 59, 999);
    return googleEvents.filter((e) => {
      if (hiddenCalendarIds.includes(e.calendarId)) return false;
      if (!e.allDay) return false;
      const s = parseISO(e.start);
      const end = parseISO(e.end);
      return s < dEnd && end > dStart;
    });
  };

  const getRdvsForDay = (day: Date) => {
    const dStart = new Date(day); dStart.setHours(0, 0, 0, 0);
    const dEnd = new Date(day); dEnd.setHours(23, 59, 59, 999);
    return rdvs.filter((r) => {
      if (hiddenCalendarIds.includes("pipeline")) return false;
      const s = parseISO(r.start_time);
      const end = parseISO(r.end_time);
      return s < dEnd && end > dStart;
    });
  };

  const getDayMinutes = (date: Date, currentDay: Date) => {
    const dayStart = new Date(currentDay); dayStart.setHours(HOUR_START, 0, 0, 0);
    const dayEnd = new Date(currentDay); dayEnd.setHours(HOUR_END, 0, 0, 0);
    if (date < dayStart) return 0;
    if (date > dayEnd) return (HOUR_END - HOUR_START) * 60;
    return (date.getHours() - HOUR_START) * 60 + date.getMinutes();
  };

  const getBlockStyle = (startStr: string, endStr: string, currentDay: Date) => {
    const s = parseISO(startStr);
    const e = parseISO(endStr);
    const startMin = getDayMinutes(s, currentDay);
    const endMin = getDayMinutes(e, currentDay);
    const dur = endMin - startMin;
    return { top: `${(startMin / 60) * HOUR_HEIGHT}px`, height: `${Math.max((dur / 60) * HOUR_HEIGHT, 18)}px` };
  };

  // Color map
  const uniqueCalIds = useMemo(() => [...new Set(googleEvents.map((e) => e.calendarId))], [googleEvents]);
  const calColors = useMemo(
    () => Object.fromEntries(calendarIds.map((id, i) => [id, CALENDAR_COLORS[i % CALENDAR_COLORS.length]])),
    [calendarIds]
  );

  // Current time indicator
  const now = new Date();
  const nowMinutes = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
  const showNowLine = nowMinutes >= 0 && nowMinutes <= TOTAL_HOURS * 60;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-300">
      {/* ── Header Bar Google Style ── */}
      <header className="shrink-0 flex h-14 items-center justify-between px-4 border-b border-slate-700/60">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <span className="text-[20px] font-medium text-slate-200">Calendrier</span>
          </div>
          <Button variant="outline" onClick={goToday} className="h-9 px-4 rounded-md border-slate-700 bg-transparent hover:bg-slate-800 text-slate-200 font-medium cursor-pointer active:scale-95 transition-all">Aujourd&apos;hui</Button>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" onClick={goPrev} className="text-slate-400 hover:text-slate-200 rounded-full h-9 w-9 cursor-pointer active:scale-95 transition-all"><ChevronLeft className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={goNext} className="text-slate-400 hover:text-slate-200 rounded-full h-9 w-9 cursor-pointer active:scale-95 transition-all"><ChevronRight className="h-5 w-5" /></Button>
          </div>
          <span className="text-[20px] font-normal text-slate-200 capitalize ml-2">
            {format(weekStart, "MMMM yyyy", { locale: fr })}
          </span>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-teal-500 ml-4" />}
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 flex min-h-0">

        {/* ── Left Sidebar (Google Style) ── */}
        <aside className="w-[260px] shrink-0 flex flex-col p-4 border-r border-slate-700/60 overflow-y-auto custom-scrollbar">
          {/* Create Button */}
          <button
            onClick={() => setShowNewRdv(true)}
            className="w-[210px] h-[48px] rounded-full bg-slate-800 hover:bg-slate-700 hover:shadow-lg text-slate-200 flex items-center justify-start px-2 gap-3 border border-slate-700/60 mb-8 transition-all active:scale-[0.98] cursor-pointer group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 shadow-sm shadow-teal-500/20">
              <Plus className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
            <span className="font-medium text-[14px]">Créer un rendez-vous</span>
          </button>

          {/* Mini Calendar */}
          <div className="mb-6 -mx-2">
            <MiniCalendar
              viewDate={miniCalDate}
              selectedDate={currentDate}
              onDateClick={(d) => {
                setCurrentDate(d);
                setMiniCalDate(d);
              }}
              onViewDateChange={setMiniCalDate}
            />
          </div>

          {/* Search Input */}
          <div className="relative mb-6">
            <Users className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Rechercher des rdv..." className="w-full bg-slate-800/60 border border-slate-700/60 rounded pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500/50" />
          </div>

          {/* Calendars lists */}
          <div className="flex-1 space-y-5">
            {/* Accordion Mes agendas */}
            <div className="flex flex-col">
              <div
                onClick={() => setExpandedAgendas(!expandedAgendas)}
                className="flex items-center justify-between text-slate-300 font-medium text-sm mb-2 hover:bg-slate-800/60 p-1.5 -mx-1.5 rounded cursor-pointer transition-colors group"
              >
                <span>Mes agendas</span>
                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-300", !expandedAgendas && "-rotate-90")} />
              </div>

              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out pl-1",
                  expandedAgendas ? "max-h-[500px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-4 pointer-events-none"
                )}
              >
                <div className="space-y-0.5">
                  {calendarIds.map((id) => {
                    const isHidden = hiddenCalendarIds.includes(id);
                    return (
                      <div key={id} onClick={() => toggleCalendarVisibility(id)} className={cn("flex items-center gap-3 text-sm group cursor-pointer hover:bg-slate-800/40 p-1 -mx-1 rounded transition-colors justify-between pr-2", isHidden ? "text-slate-500" : "text-slate-300")}>
                        <div className="flex items-center gap-3 truncate">
                          <div className={cn("h-4 w-4 rounded-sm flex items-center justify-center shrink-0", (calColors[id] || CALENDAR_COLORS[0]).bg, (calColors[id] || CALENDAR_COLORS[0]).border, "border-2 opacity-90 group-hover:opacity-100", isHidden && "grayscale")}>
                          </div>
                          <span className="truncate">{getCalendarLabel(id)}</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-teal-400 hover:bg-transparent cursor-pointer active:scale-95 transition-all">
                            {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Rendez-vous planifiés toggle */}
                  <div onClick={() => toggleCalendarVisibility("pipeline")} className={cn("flex items-center gap-3 text-sm group cursor-pointer hover:bg-slate-800/40 p-1 -mx-1 rounded transition-colors mt-2 justify-between pr-2", hiddenCalendarIds.includes("pipeline") ? "text-slate-500" : "text-slate-300")}>
                    <div className="flex items-center gap-3 truncate">
                      <div className={cn("h-4 w-4 rounded-sm bg-teal-500/20 border-teal-500 border-2 flex items-center justify-center shrink-0 opacity-90 group-hover:opacity-100", hiddenCalendarIds.includes("pipeline") && "grayscale")}>
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      </div>
                      <span className="truncate">Rendez-vous planifiés</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-teal-400 hover:bg-transparent">
                        {hiddenCalendarIds.includes("pipeline") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Accordion Pipeline RDVs List */}
            <div className="flex flex-col">
              <div
                onClick={() => setExpandedUpcoming(!expandedUpcoming)}
                className="flex items-center justify-between text-slate-300 font-medium text-sm mb-2 hover:bg-slate-800/60 p-1.5 -mx-1.5 rounded cursor-pointer transition-colors group"
              >
                <span>Rendez-vous à venir</span>
                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-300", !expandedUpcoming && "-rotate-90")} />
              </div>

              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  expandedUpcoming ? "max-h-[800px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-4 pointer-events-none"
                )}
              >
                {rdvs.length === 0 ? (
                  <div className="pl-1 text-sm text-slate-500 italic mt-1 pb-2">Aucun RDV</div>
                ) : (
                  <div className="space-y-0.5 pb-2">
                    {rdvs.map((rdv) => (
                      <div key={rdv.id} onClick={() => setSelectedRdv(rdv)} className="cursor-pointer flex flex-col gap-0.5 text-xs text-slate-400 hover:bg-slate-800/60 p-1.5 -mx-1.5 rounded transition-colors group">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-teal-400 truncate pr-2">{rdv.title}</span>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm("Supprimer ?")) return;
                              try {
                                await fetch("/api/calendar/events", {
                                  method: "DELETE",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ title: rdv.title, start: rdv.start_time }),
                                });
                              } catch { }
                              await supabase.from("rendez_vous").delete().eq("id", rdv.id);
                              loadRdvs();
                            }}
                            className="opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center rounded text-slate-500 hover:text-red-400 transition-all shrink-0"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="truncate text-[11px] font-medium text-slate-500">{format(parseISO(rdv.start_time), "EEE d MMM · HH:mm", { locale: fr })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </aside>

        {/* ── Week Grid Area ── */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900 relative">

          {/* Main scrollable area */}
          <div ref={gridRef} className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar flex flex-col min-h-0">

            {/* Header row (sticky conceptually, or just scrolls with horizontal, but fixed vertical. Google sticks it to top) */}
            <div className="sticky top-0 z-30 bg-slate-900 flex flex-col min-w-[700px]">

              {/* Row 1: Day Headers */}
              <div className="flex">
                {/* Empty corner for GMT label (placeholder) */}
                <div className="w-[60px] shrink-0 border-r border-slate-700/60" />

                {/* Days Labels Header */}
                <div className="flex-1 grid grid-cols-7 relative z-10">
                  {weekDays.map((day, i) => {
                    const isTodayDay = isToday(day);
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-center flex-col py-3 border-l border-slate-700/60",
                          i === 0 && "border-l-0"
                        )}
                      >
                        <div className={cn("text-[11px] font-medium uppercase tracking-widest mb-1.5", isTodayDay ? "text-teal-400" : "text-slate-400")}>
                          {format(day, "EEE.", { locale: fr })}
                        </div>
                        <div className={cn(
                          "text-2xl font-normal w-[46px] h-[46px] rounded-full flex items-center justify-center leading-none",
                          isTodayDay ? "bg-teal-500 text-white" : "text-slate-200 hover:bg-slate-800 cursor-pointer transition-colors"
                        )}>
                          {format(day, "d")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: All-Day Events */}
              <div className="flex border-b border-slate-700/60">
                <div className="w-[60px] flex flex-col items-end justify-start pt-1.5 pr-2 shrink-0 border-r border-slate-700/60">
                  <span className="text-[10px] text-slate-500 font-medium tabular-nums">GMT+02</span>
                </div>
                <div className="flex-1 grid grid-cols-7 min-h-[4px]">
                  {weekDays.map((day, i) => {
                    const dayAllDay = getAllDayEventsForDay(day);
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex flex-col gap-1 p-1 pb-1 border-l border-slate-700/60",
                          i === 0 && "border-l-0"
                        )}
                      >
                        {dayAllDay.map((event) => {
                          const colors = calColors[event.calendarId] || { bg: "bg-blue-500/20", border: "border-l-blue-500", text: "text-blue-300" };
                          return (
                            <div
                              key={event.id}
                              className={cn(
                                "rounded px-2 py-0.5 text-[11px] font-medium truncate cursor-default border border-slate-700/60 border-l-[3px]",
                                colors.bg, colors.text, colors.border
                              )}
                              onMouseMove={(e) => setHoverTooltip({
                                x: e.clientX,
                                y: e.clientY,
                                content: `${event.title}${event.location ? `\n${event.location}` : ""}\n[Toute la journée]\n${getCalendarLabel(event.calendarId)}`
                              })}
                              onMouseLeave={() => setHoverTooltip(null)}
                            >
                              {event.title}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Grid Body */}
            <div className="flex flex-1 min-w-[700px] relative">

              {/* Time Gutter */}
              <div className="w-[60px] shrink-0 border-r border-slate-700/60 relative">
                {hours.map((h) => (
                  <div key={h} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                    <div className="absolute right-2 -top-2.5 flex items-center">
                      <span className="text-[10px] font-medium text-slate-500 tabular-nums">{`${h.toString().padStart(2, "0")}:00`}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              <div className="flex-1 grid grid-cols-7 relative border-l border-slate-700/60">
                {/* Horizontal hour lines spanning all days */}
                <div className="absolute inset-0 pointer-events-none flex flex-col z-0">
                  {hours.map((h) => (
                    <div key={h} className="border-t border-slate-700/40 w-full" style={{ height: `${HOUR_HEIGHT}px` }} />
                  ))}
                </div>

                {weekDays.map((day, dayIdx) => {
                  const dayEvents = getEventsForDay(day);
                  const dayRdvs = getRdvsForDay(day);
                  const todayCol = isToday(day);

                  // Collision map logic
                  const layoutItems: LayoutItem[] = [
                    ...dayEvents.map((e) => {
                      const s = parseISO(e.start);
                      const end = parseISO(e.end);
                      return { id: `ge-${e.id}`, startMin: getDayMinutes(s, day), endMin: getDayMinutes(end, day) };
                    }),
                    ...dayRdvs.map((r) => {
                      const s = parseISO(r.start_time);
                      const end = parseISO(r.end_time);
                      return { id: `rdv-${r.id}`, startMin: getDayMinutes(s, day), endMin: getDayMinutes(end, day) };
                    }),
                  ];
                  const collisions = computeCollisionLayout(layoutItems);

                  const PAD = 2;
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
                        "relative border-l border-slate-700/40",
                        dayIdx === 0 && "border-l-0"
                      )}
                    >
                      {/* Now indicator */}
                      {todayCol && showNowLine && (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none"
                          style={{ top: `${(nowMinutes / 60) * HOUR_HEIGHT}px` }}
                        >
                          <div className="flex items-center w-full">
                            <div className="h-3 w-3 rounded-full bg-teal-500 -ml-1.5 shadow-sm shadow-teal-500/50" />
                            <div className="flex-1 h-[2px] bg-teal-500/70" />
                          </div>
                        </div>
                      )}

                      {/* Google Calendar events */}
                      {dayEvents.map((event) => {
                        const style = { ...getBlockStyle(event.start, event.end, day), ...getColStyle(`ge-${event.id}`) };
                        const start = parseISO(event.start);
                        const end = parseISO(event.end);
                        const durationMins = (end.getTime() - start.getTime()) / (1000 * 60);
                        const isShort = durationMins < 45;
                        const isTiny = durationMins <= 15;
                        const colors = calColors[event.calendarId] || { bg: "bg-blue-500/10", border: "border-l-blue-500", text: "text-blue-300" };

                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "absolute rounded px-1.5 py-0.5 overflow-hidden border border-slate-700/60 border-l-[4px] hover:opacity-90 transition-opacity flex flex-col z-10 cursor-default",
                              colors.bg, colors.text, colors.border
                            )}
                            style={style}
                            onMouseMove={(e) => setHoverTooltip({
                              x: e.clientX,
                              y: e.clientY,
                              content: `${event.title}${event.location ? `\n${event.location}` : ""}\n${isSameDay(start, end) ? `${format(start, "HH:mm")} - ${format(end, "HH:mm")}` : `${format(start, "d MMM HH:mm", { locale: fr })} - ${format(end, "d MMM HH:mm", { locale: fr })}`}\n${getCalendarLabel(event.calendarId)}`
                            })}
                            onMouseLeave={() => setHoverTooltip(null)}
                          >
                            <p className={cn(
                              "font-medium truncate leading-snug",
                              isTiny ? "text-[10px]" : "text-[12px]"
                            )}>
                              {event.title}
                            </p>
                            {!isShort && (
                              <p className="text-[10px] opacity-80 truncate">
                                {isSameDay(start, end)
                                  ? `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`
                                  : isSameDay(start, day)
                                    ? `${format(start, "HH:mm")} →`
                                    : isSameDay(end, day)
                                      ? `→ ${format(end, "HH:mm")}`
                                      : "→ Toute la journée →"
                                }
                              </p>
                            )}
                          </div>
                        );
                      })}

                      {/* Pipeline RDVs */}
                      {dayRdvs.map((rdv) => {
                        const style = { ...getBlockStyle(rdv.start_time, rdv.end_time, day), ...getColStyle(`rdv-${rdv.id}`) };
                        const start = parseISO(rdv.start_time);
                        const end = parseISO(rdv.end_time);
                        const durationMins = (end.getTime() - start.getTime()) / (1000 * 60);
                        const isShort = durationMins < 45;
                        const isTiny = durationMins <= 15;

                        return (
                          <div
                            key={rdv.id}
                            onClick={() => setSelectedRdv(rdv)}
                            className="absolute rounded px-2 py-1 cursor-pointer overflow-hidden bg-red-500/25 border border-red-500/40 border-l-[4px] border-l-red-500 hover:bg-red-500/35 transition-all z-[11] shadow-sm"
                            style={style}
                            onMouseMove={(e) => setHoverTooltip({
                              x: e.clientX,
                              y: e.clientY,
                              content: `${rdv.title}\n${isSameDay(start, end) ? `${format(start, "HH:mm")} - ${format(end, "HH:mm")}` : `${format(start, "d MMM HH:mm", { locale: fr })} - ${format(end, "d MMM HH:mm", { locale: fr })}`}\nPipeline`
                            })}
                            onMouseLeave={() => setHoverTooltip(null)}
                          >
                            <p className={cn(
                              "font-medium text-white truncate leading-snug",
                              isTiny ? "text-[10px]" : "text-[12px]"
                            )}>
                              {rdv.title}
                            </p>
                            {!isShort && (
                              <p className="text-[10px] text-slate-400 truncate">
                                {isSameDay(start, end)
                                  ? `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`
                                  : isSameDay(start, day)
                                    ? `${format(start, "HH:mm")} →`
                                    : isSameDay(end, day)
                                      ? `→ ${format(end, "HH:mm")}`
                                      : "→ Toute la journée →"
                                }
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
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

      {/* Floating tooltip */}
      {hoverTooltip && (
        <div
          className="pointer-events-none fixed z-[100] bg-black/80 backdrop-blur-sm text-slate-200 text-[12px] px-2.5 py-1.5 rounded shadow-xl border border-white/10 whitespace-pre-line"
          style={{ left: hoverTooltip.x + 12, top: hoverTooltip.y + 12 }}
        >
          {hoverTooltip.content}
        </div>
      )}

      {/* Basic styles for generic custom-scrollbar class if not defined globally */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 14px;
          height: 14px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #1e293b;
          border-radius: 20px;
          border: 4px solid #0f172a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #55585d;
        }

        .accordion-content {
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: top;
        }

        @keyframes slideDown {
          from { 
            opacity: 0;
            transform: translateY(-10px) scaleY(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
        }
      `}} />
    </div>
  );
}
