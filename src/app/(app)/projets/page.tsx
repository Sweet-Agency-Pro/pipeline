import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, DollarSign, ExternalLink } from "lucide-react";
import { PROJECT_STATUS_CONFIG, type Project, type Client, type ProjectStatus } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ProjectsFilter } from "./projects-filter";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; sort?: string }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Parse sort param
  const [sortField, sortDir] = (params.sort || "created_at:desc").split(":");
  const ascending = sortDir === "asc";

  let query = supabase
    .from("projects")
    .select("*, clients!inner(*)")
    .order(sortField || "created_at", { ascending });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.search) {
    const searchTerm = Array.isArray(params.search) ? params.search[0] : params.search;
    
    const { data: matchingClients } = await supabase
      .from("clients")
      .select("id")
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);
    
    const clientIds = matchingClients?.map(c => c.id) || [];

    let orConditions = [
      `name.ilike.%${searchTerm}%`,
      `description.ilike.%${searchTerm}%`
    ];
    
    if (clientIds.length > 0) {
      orConditions.push(`client_id.in.(${clientIds.join(',')})`);
    }

    query = query.or(orConditions.join(','));
  }

  const { data: projects, error } = await query;
  
  if (error) {
    console.error("Erreur recherche projets:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Projets</h1>
          <p className="text-slate-400">
            Suivi opérationnel de vos contrats gagnés
          </p>
        </div>
      </div>

      <ProjectsFilter
        currentSearch={params.search}
        currentStatus={params.status}
        currentSort={params.sort}
      />

      {!projects || projects.length === 0 ? (
        <Card className="border-slate-700 bg-slate-800/60">
          <CardContent className="flex h-32 flex-col items-center justify-center text-slate-400 gap-1">
            <p>Aucun projet trouvé avec ces critères.</p>
            {params.search && (
              <p className="text-xs">
                La recherche inclut le nom, la description du projet et les infos client.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => {
            const statusConfig = PROJECT_STATUS_CONFIG[project.status as ProjectStatus];
            const client = project.clients;
            return (
              <Link key={project.id} href={`/projets/${project.id}`}>
                <Card className="border-slate-700 bg-slate-800/60 transition-all hover:bg-slate-700/50 hover:border-slate-600 h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg text-white leading-tight">
                        {project.name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className={`${statusConfig.bgColor} ${statusConfig.color} border-0 shrink-0 shadow-sm`}
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>
                    {client && (
                      <div className="mt-1 text-sm text-slate-400">
                        <span className="font-medium text-slate-300">
                          {client.first_name} {client.last_name}
                        </span>
                        {client.company && (
                          <span className="text-slate-500"> — {client.company}</span>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <DollarSign className="h-4 w-4 text-slate-500" />
                        {formatCurrency(project.budget)}
                      </div>
                      {project.deadline && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          {formatDate(project.deadline)}
                        </div>
                      )}
                    </div>
                    {project.github_url && (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-teal-400 ring-1 ring-inset ring-teal-500/20">
                        <ExternalLink className="h-3 w-3" />
                        GitHub
                      </div>
                    )}
                    {project.description && (
                      <p className="line-clamp-2 text-slate-400 text-xs">
                        {project.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
