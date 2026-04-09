import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Mail, Phone, CalendarPlus } from "lucide-react";
import {
  CLIENT_STATUS_CONFIG,
  type Client,
} from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ClientsFilter } from "./clients-filter";
import { ResizableTable } from "../prospects/resizable-table";
import { PlanifierRdvButton } from "@/components/planifier-rdv-button";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; source?: string; sort?: string }>;
}

function displayName(client: Client): string {
  if (client.first_name && client.first_name !== "-" && client.first_name.trim()) {
    return `${client.first_name} ${client.last_name}`;
  }
  return client.company || client.last_name;
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Parse sort param
  const [sortField, sortDir] = (params.sort || "created_at:desc").split(":");
  const ascending = sortDir === "asc";

  let query = supabase
    .from("clients")
    .select("*, assigned_profile:profiles!clients_assigned_to_fkey(*)")
    .order(sortField || "created_at", { ascending });

  // Exclude prospects — they have their own page
  query = query.neq("status", "prospect");

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  if (params.source && params.source !== "all") {
    query = query.eq("source", params.source);
  }

  if (params.search) {
    const search = `%${params.search}%`;
    query = query.or(
      `first_name.ilike.${search},last_name.ilike.${search},company.ilike.${search},email.ilike.${search},phone.ilike.${search},source.ilike.${search},notes.ilike.${search}`
    );
  }

  const { data: clients } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Clients</h1>
          <p className="text-slate-400">
            Gérez vos prospects et clients
          </p>
        </div>
        <Link href="/clients/nouveau">
          <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 border-0 shadow-lg shadow-teal-500/20">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau client
          </Button>
        </Link>
      </div>

      <ClientsFilter
        currentStatus={params.status}
        currentSearch={params.search}
        currentSource={params.source}
        currentSort={params.sort}
      />

      <div className="rounded-lg border border-slate-700 bg-slate-800/60 overflow-hidden">
        <ResizableTable
          columns={[
            { key: "name", label: "Nom", defaultWidth: 180, minWidth: 80 },
            { key: "company", label: "Entreprise", defaultWidth: 180, minWidth: 80 },
            { key: "contact", label: "Contact", defaultWidth: 80, minWidth: 60 },
            { key: "status", label: "Statut", defaultWidth: 110, minWidth: 80 },
            { key: "source", label: "Source", defaultWidth: 120, minWidth: 60 },
            { key: "amount", label: "Montant estimé", defaultWidth: 130, minWidth: 80, className: "text-right" },
            { key: "date", label: "Dernier contact", defaultWidth: 120, minWidth: 80 },
            { key: "esquisse", label: "Esquisse", defaultWidth: 90, minWidth: 60 },
            { key: "rdv", label: "RDV", defaultWidth: 110, minWidth: 80 },
          ]}
        >
          {(!clients || clients.length === 0) ? (
            <tr>
              <td
                colSpan={9}
                className="h-24 text-center text-muted-foreground"
              >
                Aucun client trouvé
              </td>
            </tr>
          ) : (
            clients.map((client: Client) => {
              const statusConfig = CLIENT_STATUS_CONFIG[client.status];
              return (
                <tr key={client.id} className="group relative cursor-pointer border-b transition-colors hover:bg-slate-700/50 last:border-0">
                  <td className="px-2 py-3 font-medium text-slate-200 truncate overflow-hidden">
                    <Link
                      href={`/clients/${client.id}`}
                      className="absolute inset-0 z-0"
                    />
                    {displayName(client)}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground truncate overflow-hidden">
                    {client.company || "—"}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2 relative z-10">
                      {client.email && (
                        <a
                          href={`mailto:${client.email}`}
                          className="text-muted-foreground hover:text-foreground"
                          title={client.email}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {client.phone && (
                        <a
                          href={`tel:${client.phone}`}
                          className="text-muted-foreground hover:text-foreground"
                          title={client.phone}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <Badge
                      variant="secondary"
                      className={`${statusConfig.bgColor} ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </Badge>
                  </td>
                  <td className="px-2 py-3 text-muted-foreground truncate overflow-hidden">
                    {client.source || "—"}
                  </td>
                  <td className="px-2 py-3 text-right font-medium">
                    {formatCurrency(client.estimated_amount)}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDate(client.last_contacted_at)}
                  </td>
                  <td className="px-2 py-3">
                    {client.github_url ? (
                      <a
                        href={client.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300 hover:underline relative z-10"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Voir
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3 relative z-10">
                    <PlanifierRdvButton
                      clientId={client.id}
                      clientLabel={displayName(client)}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
                    />
                  </td>
                </tr>
              );
            })
          )}
        </ResizableTable>
      </div>
    </div>
  );
}
