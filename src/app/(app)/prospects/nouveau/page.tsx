"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { CLIENT_SOURCES, type Profile } from "@/types";
import { ArrowLeft, Loader2, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { NouveauRdvDialog } from "@/app/(app)/calendrier/nouveau-rdv-dialog";

export default function NewProspectPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // RDV dialog after creation
  const wantsRdv = useRef(false);
  const [savedClient, setSavedClient] = useState<{ id: string; label: string } | null>(null);
  const [rdvDialogOpen, setRdvDialogOpen] = useState(false);
  const [rdvProfiles, setRdvProfiles] = useState<Profile[]>([]);
  const [rdvClients, setRdvClients] = useState<{ id: string; label: string }[]>([]);
  const [rdvCalendarIds, setRdvCalendarIds] = useState<string[]>([]);
  const rdvDataLoaded = useRef(false);

  const loadRdvData = useCallback(async () => {
    if (rdvDataLoaded.current) return;
    const [profilesRes, clientsRes, configRes] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("clients").select("id, first_name, last_name, company").neq("status", "perdu").order("last_name"),
      fetch("/api/calendar/config").then((r) => r.json()),
    ]);
    setRdvProfiles((profilesRes.data as Profile[]) || []);
    setRdvClients(
      clientsRes.data?.map((c: { id: string; first_name: string; last_name: string; company?: string }) => ({
        id: c.id,
        label: `${c.first_name} ${c.last_name}${c.company ? ` (${c.company})` : ""}`,
      })) || []
    );
    setRdvCalendarIds(configRes.calendarIds || []);
    rdvDataLoaded.current = true;
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const prospectData = {
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      company: (formData.get("company") as string) || null,
      source: (formData.get("source") as string) || null,
      estimated_amount: parseFloat(formData.get("estimated_amount") as string) || 0,
      notes: (formData.get("notes") as string) || null,
      status: "prospect" as const,
      created_by: user?.id,
      assigned_to: user?.id,
    };

    const { data, error } = await supabase
      .from("clients")
      .insert(prospectData)
      .select()
      .single();

    if (!error && data) {
      await supabase.from("activity_log").insert({
        user_id: user?.id,
        action: `Nouveau prospect ajouté : ${prospectData.first_name} ${prospectData.last_name}`,
        entity_type: "client",
        entity_id: data.id,
      });

      if (wantsRdv.current) {
        const label = `${prospectData.first_name} ${prospectData.last_name}${prospectData.company ? ` (${prospectData.company})` : ""}`;
        setSavedClient({ id: data.id, label });
        await loadRdvData();
        setRdvDialogOpen(true);
        setLoading(false);
        wantsRdv.current = false;
        return;
      }

      router.push("/prospects");
      router.refresh();
    } else {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/prospects">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Nouveau prospect</h1>
          <p className="text-slate-400">
            Ajoutez un nouveau prospect à votre pipeline
          </p>
        </div>
      </div>

      <Card className="border-slate-700 bg-slate-800/60">
        <CardHeader>
          <CardTitle className="text-white">Informations du prospect</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  placeholder="Jean"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom *</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  placeholder="Dupont"
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="06 12 34 56 78"
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select name="source">
                  <SelectTrigger>
                    <SelectValue placeholder="Comment avez-vous trouvé ce prospect ?" />
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

            <div className="space-y-2">
              <Label htmlFor="estimated_amount">Montant estimé (€)</Label>
              <Input
                id="estimated_amount"
                name="estimated_amount"
                type="number"
                placeholder="5000"
                min="0"
                step="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Informations complémentaires..."
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 border-0 shadow-lg shadow-teal-500/20" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ajouter le prospect
              </Button>
              <Button
                type="submit"
                variant="outline"
                className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10 hover:text-teal-300"
                disabled={loading}
                onClick={() => { wantsRdv.current = true; }}
              >
                <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                Créer et planifier un RDV
              </Button>
              <Link href="/prospects">
                <Button variant="outline" type="button" className="border-slate-700 text-slate-300 hover:bg-slate-700">
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {savedClient && rdvDataLoaded.current && (
        <NouveauRdvDialog
          open={rdvDialogOpen}
          onClose={() => {
            setRdvDialogOpen(false);
            router.push("/prospects");
            router.refresh();
          }}
          onCreated={() => {
            setRdvDialogOpen(false);
            router.push("/prospects");
            router.refresh();
          }}
          profiles={rdvProfiles}
          clients={rdvClients}
          calendarIds={rdvCalendarIds}
          defaultClientId={savedClient.id}
        />
      )}
    </div>
  );
}
