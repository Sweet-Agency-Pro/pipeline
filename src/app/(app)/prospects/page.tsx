import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Phone, UserPlus } from "lucide-react";
import { type Client } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ProspectsFilter } from "./prospects-filter";
import { CsvImport } from "./csv-import";
import { ResizableTable } from "./resizable-table";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ search?: string; source?: string; sort?: string }>;
}

function displayName(prospect: Client): string {
  if (prospect.first_name && prospect.first_name !== "-" && prospect.first_name.trim()) {
    return `${prospect.first_name} ${prospect.last_name}`;
  }
  return prospect.company || prospect.last_name;
}

export default async function ProspectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Parse sort param
  const [sortField, sortDir] = (params.sort || "created_at:desc").split(":");
  const ascending = sortDir === "asc";

  let query = supabase
    .from("clients")
    .select("*, assigned_profile:profiles!clients_assigned_to_fkey(*)")
    .order(sortField || "created_at", { ascending });

  // Always filter to prospects only
  query = query.eq("status", "prospect");

  if (params.source && params.source !== "all") {
    query = query.eq("source", params.source);
  }

  if (params.search) {
    const search = `%${params.search}%`;
    query = query.or(
      `first_name.ilike.${search},last_name.ilike.${search},company.ilike.${search},email.ilike.${search},phone.ilike.${search},source.ilike.${search},notes.ilike.${search}`
    );
  }

  const { data: prospects } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Prospects</h1>
          <p className="text-slate-400">
            Gérez vos prospects avant conversion en clients
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CsvImport />
          <Link href="/prospects/nouveau">
            <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 border-0 shadow-lg shadow-teal-500/20">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau prospect
            </Button>
          </Link>
        </div>
      </div>

      <ProspectsFilter
        currentSearch={params.search}
        currentSource={params.source}
        currentSort={params.sort}
      />

      <div className="rounded-lg border border-slate-700 bg-slate-800/60 overflow-hidden">
        <ResizableTable
          columns={[
            { key: "name", label: "Nom", defaultWidth: 200, minWidth: 80 },
            { key: "company", label: "Entreprise", defaultWidth: 200, minWidth: 80 },
            { key: "contact", label: "Contact", defaultWidth: 80, minWidth: 60 },
            { key: "source", label: "Source", defaultWidth: 130, minWidth: 60 },
            { key: "amount", label: "Montant estimé", defaultWidth: 130, minWidth: 80, className: "text-right" },
            { key: "date", label: "Ajouté le", defaultWidth: 120, minWidth: 80 },
            { key: "actions", label: "Actions", defaultWidth: 100, minWidth: 80, className: "text-right" },
          ]}
        >
          {(!prospects || prospects.length === 0) ? (
            <tr>
              <td
                colSpan={7}
                className="h-24 text-center text-muted-foreground"
              >
                Aucun prospect trouvé
              </td>
            </tr>
          ) : (
            prospects.map((prospect: Client) => {
              return (
                <tr key={prospect.id} className="group relative cursor-pointer border-b transition-colors hover:bg-slate-700/50 last:border-0">
                  <td className="px-2 py-3 font-medium text-slate-200 truncate overflow-hidden">
                    <Link
                      href={`/clients/nouveau?from_prospect=${prospect.id}`}
                      className="absolute inset-0 z-0"
                    />
                    {displayName(prospect)}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground truncate overflow-hidden">
                    {prospect.company || "—"}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2 relative z-10">
                      {prospect.email && (
                        <a
                          href={`mailto:${prospect.email}`}
                          className="text-muted-foreground hover:text-foreground"
                          title={prospect.email}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {prospect.phone && (
                        <a
                          href={`tel:${prospect.phone}`}
                          className="text-muted-foreground hover:text-foreground"
                          title={prospect.phone}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-muted-foreground truncate overflow-hidden">
                    {prospect.source || "—"}
                  </td>
                  <td className="px-2 py-3 text-right font-medium">
                    {formatCurrency(prospect.estimated_amount)}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDate(prospect.created_at)}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5 text-sm text-teal-400 group-hover:text-teal-300 whitespace-nowrap">
                      <UserPlus className="h-3.5 w-3.5" />
                      Convertir
                    </span>
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
