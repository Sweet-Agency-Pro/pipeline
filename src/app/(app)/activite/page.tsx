import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ActivityLog } from "@/types";
import { formatDate, getInitials } from "@/lib/utils";
import { ActivityFilter } from "./activity-filter";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const ENTITY_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  client: { label: "Client", color: "text-cyan-400", bgColor: "bg-cyan-500/15" },
  project: { label: "Projet", color: "text-purple-400", bgColor: "bg-purple-500/15" },
  prospect: { label: "Prospect", color: "text-slate-300", bgColor: "bg-slate-700/60" },
};

interface PageProps {
  searchParams: Promise<{ search?: string; entity_type?: string; page?: string }>;
}

export default async function ActivityPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Count query for pagination
  let countQuery = supabase
    .from("activity_log")
    .select("id", { count: "exact", head: true });

  let query = supabase
    .from("activity_log")
    .select("*, profile:profiles!activity_log_user_id_fkey(*)")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (params.entity_type && params.entity_type !== "all") {
    query = query.eq("entity_type", params.entity_type);
    countQuery = countQuery.eq("entity_type", params.entity_type);
  }

  if (params.search) {
    query = query.ilike("action", `%${params.search}%`);
    countQuery = countQuery.ilike("action", `%${params.search}%`);
  }

  const [{ data: activities }, { count }] = await Promise.all([query, countQuery]);

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function formatDateTime(date: string): string {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  function buildPageUrl(p: number) {
    const sp = new URLSearchParams();
    if (params.search) sp.set("search", params.search);
    if (params.entity_type) sp.set("entity_type", params.entity_type);
    sp.set("page", String(p));
    return `/activite?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Activité récente</h1>
        <p className="text-slate-400">
          Historique de toutes les actions effectuées
        </p>
      </div>

      <ActivityFilter
        currentSearch={params.search}
        currentEntityType={params.entity_type}
      />

      <div className="rounded-lg border border-slate-700 bg-slate-800/60 overflow-hidden">
        <div className="divide-y divide-slate-700/50">
          {(!activities || activities.length === 0) ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground">
              Aucune activité trouvée
            </div>
          ) : (
            activities.map((activity: ActivityLog) => {
              const entityConfig = ENTITY_TYPE_CONFIG[activity.entity_type] ?? {
                label: activity.entity_type,
                color: "text-slate-300",
                bgColor: "bg-slate-700/60",
              };

              return (
                <div key={activity.id} className="flex items-start gap-4 px-4 py-3 hover:bg-slate-700/30 transition-colors">
                  <Avatar className="h-8 w-8 mt-0.5 shrink-0">
                    <AvatarFallback className="bg-slate-700 text-xs text-slate-300">
                      {getInitials(activity.profile?.full_name ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200 truncate">
                        {activity.profile?.email ?? "Utilisateur inconnu"}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`${entityConfig.bgColor} ${entityConfig.color} text-xs`}
                      >
                        {entityConfig.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {activity.action}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap shrink-0 mt-1">
                    {formatDateTime(activity.created_at)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {totalCount} résultat{totalCount > 1 ? "s" : ""} — page {page}/{totalPages}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={buildPageUrl(page - 1)}>
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-700">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédent
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="border-slate-700 text-slate-500">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Précédent
              </Button>
            )}
            {page < totalPages ? (
              <Link href={buildPageUrl(page + 1)}>
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-700">
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="border-slate-700 text-slate-500">
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
