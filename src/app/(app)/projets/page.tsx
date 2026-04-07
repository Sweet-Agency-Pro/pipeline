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
import { PROJECT_STATUS_CONFIG, type Project, type Client } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*, client:clients(*)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Projets</h1>
        <p className="text-slate-400">
          Projets en cours pour les clients gagnés
        </p>
      </div>

      {!projects || projects.length === 0 ? (
        <Card className="border-slate-700 bg-slate-800/60">
          <CardContent className="flex h-32 items-center justify-center text-slate-400">
            Aucun projet pour le moment. Les projets sont créés
            automatiquement quand un client passe au statut
            &quot;Gagné&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: Project & { client: Client }) => {
            const statusConfig = PROJECT_STATUS_CONFIG[project.status];
            return (
              <Link key={project.id} href={`/projets/${project.id}`}>
                <Card className="border-slate-700 bg-slate-800/60 transition-all hover:bg-slate-700/50 hover:border-slate-600">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg text-white">
                        {project.name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>
                    {project.client && (
                      <p className="text-sm text-slate-400">
                        {project.client.first_name} {project.client.last_name}
                        {project.client.company &&
                          ` — ${project.client.company}`}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(project.budget)}
                    </div>
                    {project.deadline && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="h-4 w-4" />
                        {formatDate(project.deadline)}
                      </div>
                    )}
                    {project.github_url && (
                      <div className="flex items-center gap-2 text-teal-400">
                        <ExternalLink className="h-4 w-4" />
                        GitHub
                      </div>
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
