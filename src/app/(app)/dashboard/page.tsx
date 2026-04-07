import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FolderKanban,
  TrendingUp,
  DollarSign,
  Clock,
} from "lucide-react";
import {
  CLIENT_STATUS_CONFIG,
  type ClientStatus,
  type ActivityLog,
  type Profile,
} from "@/types";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const supabase = await createClient();

  const [clientsRes, projectsRes, activityRes] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase.from("projects").select("*"),
    supabase
      .from("activity_log")
      .select("*, profile:profiles(*)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    clients: clientsRes.data ?? [],
    projects: projectsRes.data ?? [],
    activities: (activityRes.data ?? []) as (ActivityLog & {
      profile: Profile;
    })[],
  };
}

export default async function DashboardPage() {
  const { clients, projects, activities } = await getDashboardData();

  const totalClients = clients.length;
  const activeProjects = projects.filter((p) => p.status === "en_cours").length;
  const totalPipeline = clients
    .filter((c) => !["gagne", "perdu"].includes(c.status))
    .reduce((sum: number, c: { estimated_amount: number }) => sum + (c.estimated_amount || 0), 0);
  const wonCount = clients.filter((c) => c.status === "gagne").length;
  const lostCount = clients.filter((c) => c.status === "perdu").length;
  const totalClosed = wonCount + lostCount;
  const conversionRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;
  const wonAmount = clients
    .filter((c) => c.status === "gagne")
    .reduce((sum: number, c: { estimated_amount: number }) => sum + (c.estimated_amount || 0), 0);

  // Count clients per status for pipeline
  const statusCounts = (
    Object.keys(CLIENT_STATUS_CONFIG) as ClientStatus[]
  ).map((status) => ({
    status,
    ...CLIENT_STATUS_CONFIG[status],
    count: clients.filter((c) => c.status === status).length,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-slate-400">
          Vue d&apos;ensemble de votre activité commerciale
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total Clients
            </CardTitle>
            <Users className="h-4 w-4 text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalClients}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Projets actifs
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeProjects}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Taux de conversion
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white whitespace-nowrap">
              {conversionRate > 0 ? `${conversionRate.toFixed(1)}%` : "0% Keep Pushing"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Montant gagné
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-400">
              {formatCurrency(wonAmount)}
            </div>
          </CardContent>
        </Card>
      </div>      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Left Column: Pipeline + Buttons */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-700 bg-slate-800/60 min-h-[300px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-white">Pipeline commercial</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <div className="space-y-3">
                {statusCounts.map((s) => (
                  <div key={s.status} className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={`${s.bgColor} ${s.color} min-w-[110px] justify-center border-0`}
                    >
                      {s.label}
                    </Badge>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                          style={{
                            width: `${totalClients > 0 ? (s.count / totalClients) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="min-w-[30px] text-right text-sm font-medium text-slate-300">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Links move here */}
          <div className="flex gap-3">
            <Link
              href="/clients/nouveau"
              className="inline-flex items-center rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white hover:from-teal-600 hover:to-cyan-600 shadow-lg shadow-teal-500/20 transition-all"
            >
              + Nouveau client
            </Link>
            <Link
              href="/clients"
              className="inline-flex items-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Voir tous les clients
            </Link>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <Card className="border-slate-700 bg-slate-800/60 min-h-[300px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Clock className="h-4 w-4 text-teal-400" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-slate-400">
                Aucune activité récente
              </p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-col gap-1 border-b border-slate-700 pb-3 last:border-0"
                  >
                    <p className="text-sm text-slate-200">{activity.action}</p>
                    <p className="text-xs text-slate-500">
                      {activity.profile?.full_name ?? "Utilisateur"} •{" "}
                      {formatRelativeDate(activity.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
