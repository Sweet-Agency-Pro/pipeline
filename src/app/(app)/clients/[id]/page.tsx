"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
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

export default function ClientEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("id", params.id)
        .single();
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updates = {
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      company: (formData.get("company") as string) || null,
      status: formData.get("status") as ClientStatus,
      source: (formData.get("source") as string) || null,
      github_url: (formData.get("github_url") as string) || null,
      estimated_amount: parseFloat(formData.get("estimated_amount") as string) || 0,
      notes: (formData.get("notes") as string) || null,
    };

    const { error } = await supabase
      .from("clients")
      .update(updates)
      .eq("id", params.id);

    if (!error) {
      const isWon = updates.status === "gagne";

      await supabase.from("activity_log").insert({
        user_id: user?.id,
        action: isWon 
          ? `Client ${updates.first_name} ${updates.last_name} gagné ! 🎉`
          : `Client ${updates.first_name} ${updates.last_name} modifié`,
        entity_type: "client",
        entity_id: params.id,
      });

      // Automatiquement créer un projet si le statut est "Gagné"
      if (isWon) {
        // Vérifier si un projet n'existe pas déjà pour ce client
        const { data: existingProject } = await supabase
          .from("projects")
          .select("id")
          .eq("client_id", params.id)
          .maybeSingle();

        if (!existingProject) {
          await supabase.from("projects").insert({
            name: `Projet - ${updates.company || updates.last_name}`,
            client_id: params.id,
            status: "en_attente",
            budget: updates.estimated_amount,
            github_url: updates.github_url,
            created_by: user?.id,
            description: updates.notes
          });
        }
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("activity_log").insert({
      user_id: user?.id,
      action: `Client ${client?.first_name} ${client?.last_name} supprimé`,
      entity_type: "client",
      entity_id: params.id,
    });

    await supabase.from("clients").delete().eq("id", params.id);

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
        <Link href="/clients">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
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
          clientLabel={`${client.first_name} ${client.last_name}${client.company ? ` (${client.company})` : ""}`}
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
              <Link href="/clients">
                <Button variant="outline" type="button" className="border-slate-700 text-slate-300 hover:bg-slate-700">
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
