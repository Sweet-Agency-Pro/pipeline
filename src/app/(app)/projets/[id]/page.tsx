import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  ExternalLink,
  User,
} from "lucide-react";
import { PROJECT_STATUS_CONFIG } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, client:clients(*)")
    .eq("id", id)
    .single();

  if (!project) {
    notFound();
  }

  const statusConfig = PROJECT_STATUS_CONFIG[project.status as keyof typeof PROJECT_STATUS_CONFIG];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projets">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {project.name}
            </h1>
            <Badge
              variant="secondary"
              className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
            >
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-slate-700 bg-slate-800/60">
          <CardHeader>
            <CardTitle className="text-white">Détails du projet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-slate-500" />
                <span className="text-slate-500">Budget :</span>{" "}
                <span className="font-medium text-slate-200">
                  {formatCurrency(project.budget)}
                </span>
              </div>
              {project.deadline && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="text-slate-500">Deadline :</span>{" "}
                  <span className="font-medium text-slate-200">
                    {formatDate(project.deadline)}
                  </span>
                </div>
              )}
              <div className="text-sm">
                <span className="text-slate-500">Créé le :</span>{" "}
                <span className="text-slate-300">{formatDate(project.created_at)}</span>
              </div>
            </div>

            {project.github_url && (
              <>
                <Separator className="bg-slate-700" />
                <div>
                  <h3 className="mb-2 text-sm font-medium text-slate-300">
                    Dépôt GitHub
                  </h3>
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-teal-400 hover:bg-slate-700/50 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {project.github_url}
                  </a>
                </div>
              </>
            )}

            {project.description && (
              <>
                <Separator className="bg-slate-700" />
                <div>
                  <h3 className="mb-2 text-sm font-medium text-slate-300">Description</h3>
                  <p className="whitespace-pre-wrap text-sm text-slate-400">
                    {project.description}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Client Card */}
        <Card className="border-slate-700 bg-slate-800/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="h-4 w-4 text-teal-400" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.client ? (
              <Link
                href={`/clients/${project.client.id}`}
                className="block rounded-lg border border-slate-700 p-4 hover:bg-slate-700/50 transition-colors"
              >
                <p className="font-medium text-slate-200">
                  {project.client.first_name} {project.client.last_name}
                </p>
                {project.client.company && (
                  <p className="text-sm text-slate-400">
                    {project.client.company}
                  </p>
                )}
                {project.client.email && (
                  <p className="text-sm text-slate-400">
                    {project.client.email}
                  </p>
                )}
              </Link>
            ) : (
              <p className="text-sm text-slate-400">
                Client non trouvé
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
