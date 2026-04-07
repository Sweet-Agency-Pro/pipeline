"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [prospect, setProspect] = useState<Client | null>(null);
  const prospectId = searchParams.get("from_prospect");

  useEffect(() => {
    if (!prospectId) return;
    async function loadProspect() {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("id", prospectId!)
        .single();
      if (data) setProspect(data);
    }
    loadProspect();
  }, [prospectId, supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const clientData = {
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      email: formData.get("email") as string || null,
      phone: formData.get("phone") as string || null,
      company: formData.get("company") as string || null,
      status: formData.get("status") as ClientStatus,
      source: formData.get("source") as string || null,
      github_url: formData.get("github_url") as string || null,
      estimated_amount: parseFloat(formData.get("estimated_amount") as string) || 0,
      notes: formData.get("notes") as string || null,
    };

    let resultId: string | null = null;
    let error: unknown = null;

    if (prospectId) {
      // Update existing prospect record
      const { data, error: err } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", prospectId)
        .select()
        .single();
      resultId = data?.id ?? null;
      error = err;
    } else {
      // Create new client
      const { data, error: err } = await supabase
        .from("clients")
        .insert({ ...clientData, created_by: user?.id, assigned_to: user?.id })
        .select()
        .single();
      resultId = data?.id ?? null;
      error = err;
    }

    if (!error && resultId) {
      const isStillProspect = clientData.status === "prospect";
      await supabase.from("activity_log").insert({
        user_id: user?.id,
        action: prospectId
          ? isStillProspect
            ? `Prospect mis à jour : ${clientData.first_name} ${clientData.last_name}`
            : `Prospect converti en client : ${clientData.first_name} ${clientData.last_name}`
          : `Nouveau client ajouté : ${clientData.first_name} ${clientData.last_name}`,
        entity_type: "client",
        entity_id: resultId,
      });

      // Redirect based on final status
      if (prospectId && clientData.status === "prospect") {
        router.push("/prospects");
      } else {
        router.push("/clients");
      }
      router.refresh();
    } else {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={prospectId ? "/prospects" : "/clients"}>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {prospectId ? "Modifier le prospect" : "Nouveau client"}
          </h1>
          <p className="text-slate-400">
            {prospectId
              ? "Modifiez les informations — changez le statut pour convertir en client"
              : "Ajoutez un nouveau prospect ou client"}
          </p>
        </div>
      </div>

      <Card className="border-slate-700 bg-slate-800/60">
        <CardHeader>
          <CardTitle className="text-white">Informations du client</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} key={prospect?.id ?? "new"} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  placeholder="Jean"
                  defaultValue={prospect?.first_name ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom *</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  placeholder="Dupont"
                  defaultValue={prospect?.last_name ?? ""}
                  required
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
                  defaultValue={prospect?.email ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="06 12 34 56 78"
                  defaultValue={prospect?.phone ?? ""}
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
                  defaultValue={prospect?.company ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select name="source" defaultValue={prospect?.source ?? undefined}>
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
                <Select name="status" defaultValue={prospect?.status ?? "prospect"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(CLIENT_STATUS_CONFIG) as ClientStatus[]
                    ).map((status) => (
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
                  defaultValue={prospect?.estimated_amount || ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="github_url">
                Lien GitHub (esquisse développée)
              </Label>
              <Input
                id="github_url"
                name="github_url"
                type="url"
                placeholder="https://github.com/agence-sweet/projet-client"
                defaultValue={prospect?.github_url ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Informations complémentaires..."
                rows={4}
                defaultValue={prospect?.notes ?? ""}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 border-0 shadow-lg shadow-teal-500/20" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {prospectId ? "Enregistrer" : "Ajouter le client"}
              </Button>
              <Link href={prospectId ? "/prospects" : "/clients"}>
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
