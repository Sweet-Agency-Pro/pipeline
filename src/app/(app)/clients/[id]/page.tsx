"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useActivityLog } from "@/hooks/use-activity-log";
import { autoCreateProjectIfWon } from "@/lib/supabase/mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CLIENT_STATUS_CONFIG,
  CLIENT_SOURCES,
  type ClientStatus,
  type Client,
} from "@/types";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { PlanifierRdvButton } from "@/components/planifier-rdv-button";
import { getClientLabel } from "@/lib/utils";
import { useSupabaseClient } from "@/hooks/use-supabase-client";
import {
  deleteClientRecord,
  fetchClientById,
  parseClientFormData,
  updateClientRecord,
} from "@/lib/supabase/client-records";

export default function ClientEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = useSupabaseClient();
  const { log, getUserId } = useActivityLog();
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await fetchClientById(supabase, params.id);

      if (data) {
        setClient(data);
      } else {
        setNotFound(true);
      }
    }
    load();
  }, [params.id, supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const updates = parseClientFormData(formData, {
      defaultStatus: client?.status ?? "prospect",
    });

    const { error } = await updateClientRecord(supabase, params.id, updates);

    if (!error) {
      const isWon = updates.status === "gagne";

      await log(
        isWon
          ? `Client ${updates.first_name} ${updates.last_name} gagné ! 🎉`
          : `Client ${updates.first_name} ${updates.last_name} modifié`,
        "client",
        params.id
      );

      if (isWon) {
        const userId = await getUserId();
        await autoCreateProjectIfWon(supabase, {
          clientId: params.id,
          company: updates.company,
          lastName: updates.last_name,
          estimatedAmount: updates.estimated_amount,
          githubUrl: updates.github_url,
          notes: updates.notes,
          userId,
        });
      }

      router.push("/clients");
      router.refresh();
    } else {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return;
    setLoading(true);

    await log(
      `Client ${client?.first_name} ${client?.last_name} supprimé`,
      "client",
      params.id
    );

    await deleteClientRecord(supabase, params.id);

    router.push("/clients");
    router.refresh();
  }

  if (notFound) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        Client introuvable
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white hover:bg-slate-700"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Modifier le client
          </h1>
          <p className="text-slate-400">
            Modifiez les informations du client
          </p>
        </div>
        <PlanifierRdvButton
          clientId={client.id}
          clientLabel={getClientLabel(client)}
          className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300"
        />
        <Button
          variant="outline"
          size="sm"
          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          onClick={handleDelete}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Supprimer
        </Button>
      </div>

      <Card className="border-slate-700 bg-slate-800/60">
        <CardHeader>
          <CardTitle className="text-white">Informations du client</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} key={client.id} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  placeholder="Jean"
                  defaultValue={client.first_name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  placeholder="Dupont"
                  defaultValue={client.last_name}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jean@example.com"
                  defaultValue={client.email ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="06 12 34 56 78"
                  defaultValue={client.phone ?? ""}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">Entreprise</Label>
                <Input
                  id="company"
                  name="company"
                  placeholder="Nom de l'entreprise"
                  defaultValue={client.company ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select name="source" defaultValue={client.source ?? undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Comment avez-vous trouvé ce client ?" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select name="status" defaultValue={client.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CLIENT_STATUS_CONFIG) as ClientStatus[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        {CLIENT_STATUS_CONFIG[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_amount">Montant estimé (€)</Label>
                <Input
                  id="estimated_amount"
                  name="estimated_amount"
                  type="number"
                  placeholder="5000"
                  min="0"
                  step="100"
                  defaultValue={client.estimated_amount || ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="github_url">Lien GitHub (esquisse développée)</Label>
              <Input
                id="github_url"
                name="github_url"
                type="url"
                placeholder="https://github.com/agence-sweet/projet-client"
                defaultValue={client.github_url ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Informations complémentaires..."
                rows={4}
                defaultValue={client.notes ?? ""}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 border-0 shadow-lg shadow-teal-500/20"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
              <Button
                variant="outline"
                type="button"
                className="border-slate-700 text-slate-300 hover:bg-slate-700"
                onClick={() => router.back()}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
