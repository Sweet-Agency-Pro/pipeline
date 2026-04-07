"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  ExternalLink,
  User,
  Trash2,
  Loader2,
  CheckCircle2,
  CalendarDays,
  X,
} from "lucide-react";
import { PROJECT_STATUS_CONFIG, type Project, type ProjectStatus } from "@/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    async function loadProject() {
      const { data } = await supabase
        .from("projects")
        .select("*, client:clients(*)")
        .eq("id", params.id)
        .single();

      if (data) {
        setProject(data);
      }
      setLoading(false);
    }
    loadProject();
  }, [params.id, supabase]);

  async function updateStatus(newStatus: ProjectStatus) {
    if (!project || updating) return;
    setUpdating(true);

    const { error } = await supabase
      .from("projects")
      .update({ status: newStatus })
      .eq("id", project.id);

    if (!error) {
      setProject({ ...project, status: newStatus });

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("activity_log").insert({
        user_id: user?.id,
        action: `Statut du projet "${project.name}" mis à jour : ${PROJECT_STATUS_CONFIG[newStatus].label}`,
        entity_type: "project",
        entity_id: project.id,
      });

      router.refresh();
    }
    setUpdating(false);
  }

  async function updateDeadline(newDate: Date | undefined) {
    if (!project || updating) return;
    setUpdating(true);

    const dateStr = newDate ? format(newDate, 'yyyy-MM-dd') : null;

    const { error } = await supabase
      .from("projects")
      .update({ deadline: dateStr })
      .eq("id", project.id);

    if (!error) {
      setProject({ ...project, deadline: dateStr });

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("activity_log").insert({
        user_id: user?.id,
        action: `Deadline du projet "${project.name}" mise à jour : ${dateStr ? formatDate(dateStr) : 'Supprimée'}`,
        entity_type: "project",
        entity_id: project.id,
      });

      router.refresh();
    }
    setUpdating(false);
  }

  async function handleDelete() {
    if (!project || updating) return;
    setUpdating(true);

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("activity_log").insert({
        user_id: user?.id,
        action: `Projet supprimé : ${project.name}`,
        entity_type: "project",
        entity_id: null,
      });

      router.push("/projets");
      router.refresh();
    } else {
      setUpdating(false);
      setShowDeleteDialog(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        Projet introuvable
      </div>
    );
  }

  const statusConfig = PROJECT_STATUS_CONFIG[project.status as keyof typeof PROJECT_STATUS_CONFIG];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/projets">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
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

        <div className="flex items-center gap-3">
          <Select
            value={project.status}
            onValueChange={(v) => updateStatus(v as ProjectStatus)}
            disabled={updating}
          >
            <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-200">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${statusConfig.bgColor.replace('bg-', 'bg-').split('/')[0]}`} />
                {statusConfig.label}
              </div>
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {(Object.keys(PROJECT_STATUS_CONFIG) as ProjectStatus[]).map((status) => (
                <SelectItem key={status} value={status} className="text-slate-200 focus:bg-slate-700 focus:text-white">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${PROJECT_STATUS_CONFIG[status].bgColor.replace('bg-', 'bg-').split('/')[0]}`} />
                    {PROJECT_STATUS_CONFIG[status].label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => setShowDeleteDialog(true)}
            disabled={updating}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-slate-700 bg-slate-800/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Détails du projet</CardTitle>
            {updating && <Loader2 className="h-4 w-4 animate-spin text-teal-400" />}
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
            </div>

            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Deadline</span>
              <Popover>
                <PopoverTrigger>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-slate-900/50 border-slate-700 hover:bg-slate-700/50 hover:text-white transition-all",
                      !project.deadline && "text-slate-500"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-teal-400" />
                    {project.deadline ? (
                      format(new Date(project.deadline), "PPP", { locale: fr })
                    ) : (
                      <span>Définir une échéance</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700 shadow-2xl" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={project.deadline ? new Date(project.deadline) : undefined}
                    onSelect={updateDeadline}
                    initialFocus
                    className="bg-slate-900 text-slate-200"
                    locale={fr}
                    classNames={{
                      today: "bg-red-500/20 text-red-400 font-bold rounded-md",
                    }}
                  />
                  {project.deadline && (
                    <div className="p-2 border-t border-slate-700 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateDeadline(undefined)}
                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="mr-1 h-3 w-3" /> Effacer
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="text-sm">
              <span className="text-slate-500">Créé le :</span>{" "}
              <span className="text-slate-300">{formatDate(project.created_at)}</span>
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
                    <span className="truncate max-w-[200px] sm:max-w-none">{project.github_url}</span>
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

      {/* Confirmation Modal */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmer la suppression</DialogTitle>
            <DialogDescription className="text-slate-400">
              Êtes-vous sûr de vouloir supprimer le projet <span className="font-bold text-white">{project.name}</span> ?
              Cette action est irréversible et supprimera toutes les données associées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={updating}
            >
              {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
