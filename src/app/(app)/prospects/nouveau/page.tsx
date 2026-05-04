"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useActivityLog } from "@/hooks/use-activity-log";
import { useRdvFormData } from "@/hooks/use-rdv-form-data";
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
import { CLIENT_SOURCES } from "@/types";
import { ArrowLeft, Loader2, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { NouveauRdvDialog } from "@/app/(app)/calendrier/nouveau-rdv-dialog";
import { getClientLabel } from "@/lib/utils";
import { useSupabaseClient } from "@/hooks/use-supabase-client";
import {
  createClientRecord,
  parseClientFormData,
} from "@/lib/supabase/client-records";

export default function NewProspectPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { log, getUserId } = useActivityLog();
  const rdvData = useRdvFormData();
  const [loading, setLoading] = useState(false);

  // RDV dialog after creation
  const wantsRdv = useRef(false);
  const [savedClient, setSavedClient] = useState<{ id: string; label: string } | null>(null);
  const [rdvDialogOpen, setRdvDialogOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const userId = await getUserId();

    const prospectData = parseClientFormData(formData, {
      defaultStatus: "prospect",
    });

    const { data, error } = await createClientRecord(supabase, prospectData, {
      createdBy: userId,
      assignedTo: userId,
    });

    if (!error && data) {
      await log(
        `Nouveau prospect ajouté : ${prospectData.first_name} ${prospectData.last_name}`,
        "client",
        data.id
      );

      if (wantsRdv.current) {
        setSavedClient({ id: data.id, label: getClientLabel(prospectData) });
        await rdvData.load();
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
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  placeholder="Jean"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  placeholder="Dupont"
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

      {savedClient && rdvData.loaded && (
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
          profiles={rdvData.profiles}
          clients={rdvData.clients}
          calendarIds={rdvData.calendarIds}
          defaultClientId={savedClient.id}
        />
      )}
    </div>
  );
}
