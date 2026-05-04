"use client";

import { useState, useMemo } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarClock, MapPin, User, Building2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RendezVous, Profile, RdvStatus } from "@/types";
import { RDV_STATUS_CONFIG } from "@/types";
import { RdvDetailDialog } from "../calendrier/rdv-detail-dialog";
import { NouveauRdvDialog } from "../calendrier/nouveau-rdv-dialog";
import { getInitials, cn, getClientLabel } from "@/lib/utils";
import { useQueryFilters } from "@/hooks/use-query-filters";
import { RDV_FILTER_OPTIONS } from "@/lib/filter-options";

interface RdvListProps {
  initialRdvs: RendezVous[];
  profiles: Profile[];
  clients: { id: string; label: string }[];
  calendarIds: string[];
  currentFilter?: FilterType;
}

type FilterType = "Pertinence" | "Futurs" | "Passés";

export function RdvList({ initialRdvs, profiles, clients, calendarIds, currentFilter }: RdvListProps) {
  const { updateFilter } = useQueryFilters({ defaultPath: "/rendez-vous" });

  const filter = currentFilter || "Pertinence";
  const [selectedRdv, setSelectedRdv] = useState<RendezVous | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  function setFilter(value: string) {
    updateFilter("filter", value, { allValue: "Pertinence" });
  }

  // Mettre à jour l'état complet nécessite souvent un fetch, 
  // mais ici on peut rafraîchir la page ou juste masquer le modal pour laisser `router.refresh` faire son travail
  const handleUpdated = () => {
    setDetailOpen(false);
    setEditOpen(false);
    window.location.reload(); // Simple approach, or use router.refresh() if passed from server component
  };

  const handleEdit = (rdv: RendezVous) => {
    setDetailOpen(false);
    setSelectedRdv(rdv);
    setEditOpen(true);
  };

  const filteredRdvs = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();

    let result = [...initialRdvs];

    if (filter === "Pertinence") {
      // Futurs + passés de moins de 1h
      result = result.filter(r => {
        const startTime = new Date(r.start_time).getTime();
        return startTime + (60 * 60 * 1000) > nowTime;
      });
      result.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    } else if (filter === "Futurs") {
      result = result.filter(r => new Date(r.start_time).getTime() > nowTime);
      result.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    } else if (filter === "Passés") {
      result = result.filter(r => new Date(r.start_time).getTime() <= nowTime);
      result.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    }

    return result;
  }, [initialRdvs, filter]);



  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-teal-400" />
          <span className="text-sm font-medium text-slate-200">Filtre d'affichage :</span>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RDV_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste des cartes */}
      {filteredRdvs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-800/30 rounded-xl border border-slate-700/50 border-dashed">
          <CalendarClock className="h-10 w-10 text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-300">Aucun rendez-vous</h3>
          <p className="text-sm text-slate-500 mt-1">
            Il n'y a pas de rendez-vous correspondant à ce filtre.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRdvs.map((rdv) => {
            const conf = RDV_STATUS_CONFIG[rdv.status as RdvStatus];
            const startTime = parseISO(rdv.start_time);
            const endTime = parseISO(rdv.end_time);
            const isToday = isSameDay(startTime, new Date());

            return (
              <Card
                key={rdv.id}
                className="bg-slate-800/60 border-slate-700 hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/5 transition-all cursor-pointer group"
                onClick={() => {
                  setSelectedRdv(rdv);
                  setDetailOpen(true);
                }}
              >
                <CardHeader className="pb-3 border-b border-slate-700/50">
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-slate-100 group-hover:text-teal-400 transition-colors line-clamp-1">
                        {rdv.title}
                      </h3>
                      <div className="flex items-center text-xs text-slate-400 gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span className={isToday ? "text-teal-400 font-medium" : ""}>
                          {isToday ? "Aujourd'hui" : format(startTime, "EEEE d MMMM", { locale: fr })}
                        </span>
                        <span>•</span>
                        <span>{format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}</span>
                      </div>
                    </div>
                    <Badge className={cn("shrink-0 text-[10px] uppercase tracking-wider py-0 border-0", conf.bgColor, conf.color)}>
                      {conf.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-300 min-w-0">
                    <User className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="truncate">{rdv.client ? getClientLabel(rdv.client) : "Client inconnu"}</span>
                  </div>

                  {rdv.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-300 min-w-0">
                      <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="truncate text-xs">{rdv.location}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-700/30 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-medium text-slate-300 border border-slate-600 shrink-0">
                      {rdv.assigned_profile ? getInitials(rdv.assigned_profile.full_name) : "?"}
                    </div>
                    <span className="text-xs text-slate-400 truncate">
                      {rdv.assigned_profile?.full_name || "Non assigné"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      {selectedRdv && (
        <RdvDetailDialog
          rdv={selectedRdv}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          onUpdated={handleUpdated}
          onEdit={handleEdit}
          profiles={profiles}
        />
      )}

      {selectedRdv && (
        <NouveauRdvDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onCreated={handleUpdated}
          profiles={profiles}
          clients={clients}
          calendarIds={calendarIds}
          initialRdv={selectedRdv}
        />
      )}
    </div>
  );
}
