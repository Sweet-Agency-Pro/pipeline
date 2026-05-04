"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActivityLog } from "@/hooks/use-activity-log";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CLIENT_STATUS_CONFIG,
  CLIENT_SOURCES,
  type Client,
  type ClientStatus,
} from "@/types";
import { MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { useSupabaseClient } from "@/hooks/use-supabase-client";
import {
  deleteClientRecord,
  parseClientFormData,
  updateClientRecord,
  updateClientStatus,
} from "@/lib/supabase/client-records";

export function ClientActions({ client }: { client: Client }) {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { log } = useActivityLog();
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  async function handleStatusChange(newStatus: string) {
    setStatusLoading(true);

    await updateClientStatus(supabase, client.id, newStatus as ClientStatus);

    const statusLabel =
      CLIENT_STATUS_CONFIG[newStatus as ClientStatus]?.label ?? newStatus;
    await log(
      `Statut de ${client.first_name} ${client.last_name} changé en "${statusLabel}"`,
      "client",
      client.id
    );

    setStatusLoading(false);
    router.refresh();
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const updates = parseClientFormData(formData, {
      defaultStatus: client.status,
      includeLastContactedAt: true,
    });

    await updateClientRecord(supabase, client.id, updates);

    await log(
      `Client ${updates.first_name} ${updates.last_name} modifié`,
      "client",
      client.id
    );

    setLoading(false);
    setEditOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return;

    await log(
      `Client ${client.first_name} ${client.last_name} supprimé`,
      "client",
      client.id
    );

    await deleteClientRecord(supabase, client.id);

    router.push("/clients");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {/* Quick Status Change */}
      <Select
        value={client.status}
        onValueChange={(value: string | null) => {
          if (value) handleStatusChange(value);
        }}
        disabled={statusLoading}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(CLIENT_STATUS_CONFIG) as ClientStatus[]).map(
            (status) => (
              <SelectItem key={status} value={status}>
                {CLIENT_STATUS_CONFIG[status].label}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>

      {/* More Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_first_name">Prénom</Label>
                <Input
                  id="edit_first_name"
                  name="first_name"
                  defaultValue={client.first_name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_last_name">Nom</Label>
                <Input
                  id="edit_last_name"
                  name="last_name"
                  defaultValue={client.last_name}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  name="email"
                  type="email"
                  defaultValue={client.email ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Téléphone</Label>
                <Input
                  id="edit_phone"
                  name="phone"
                  defaultValue={client.phone ?? ""}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_company">Entreprise</Label>
                <Input
                  id="edit_company"
                  name="company"
                  defaultValue={client.company ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_source">Source</Label>
                <Select
                  name="source"
                  defaultValue={client.source ?? undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
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
              <Label htmlFor="edit_estimated_amount">Montant estimé (€)</Label>
              <Input
                id="edit_estimated_amount"
                name="estimated_amount"
                type="number"
                defaultValue={client.estimated_amount}
                min="0"
                step="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_github_url">
                Lien GitHub (esquisse développée)
              </Label>
              <Input
                id="edit_github_url"
                name="github_url"
                type="url"
                defaultValue={client.github_url ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                name="notes"
                defaultValue={client.notes ?? ""}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
