"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Ban, ExternalLink, Mail, Phone } from "lucide-react";
import { PlanifierRdvButton } from "@/components/planifier-rdv-button";
import { ResizableTable } from "./resizable-table";
import { CLIENT_STATUS_CONFIG, type Client } from "@/types";
import { formatCurrency, formatDate, displayClientName } from "@/lib/utils";

interface ProspectsPerdusDialogProps {
  prospects: Client[];
}

export function ProspectsPerdusDialog({ prospects }: ProspectsPerdusDialogProps) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="border-slate-700 bg-slate-900/40 text-slate-200 hover:bg-slate-800 hover:text-white" />}>
        <Ban className="mr-2 h-4 w-4 text-red-400" />
        Prospects perdus
      </DialogTrigger>
      <DialogContent className="w-[98vw] max-w-[calc(100vw-2rem)] sm:max-w-[1600px] max-h-[85vh] bg-slate-900 text-slate-200 ring-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Ban className="h-4 w-4 text-red-400" />
            Prospects perdus
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400">
              {prospects.length}
            </span>
          </DialogTitle>
        </DialogHeader>

        {prospects.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-10 text-center text-sm text-slate-500">
            Aucun prospect perdu.
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-800 bg-slate-950/60">
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
              {prospects.map((prospect) => {
                const statusConfig = CLIENT_STATUS_CONFIG[prospect.status];

                return (
                  <tr key={prospect.id} className="group relative cursor-pointer border-b border-slate-800/70 transition-colors hover:bg-slate-800/40 last:border-0">
                    <td className="px-2 py-3 font-medium text-slate-200 truncate overflow-hidden">
                      <Link href={`/clients/${prospect.id}`} className="absolute inset-0 z-0" />
                      {displayClientName(prospect)}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground truncate overflow-hidden">
                      {prospect.company || "—"}
                    </td>
                    <td className="px-2 py-3">
                      <div className="relative z-10 flex items-center gap-2">
                        {prospect.email ? (
                          <a
                            href={`mailto:${prospect.email}`}
                            className="text-muted-foreground hover:text-foreground"
                            title={prospect.email}
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        ) : null}
                        {prospect.phone ? (
                          <a
                            href={`tel:${prospect.phone}`}
                            className="text-muted-foreground hover:text-foreground"
                            title={prospect.phone}
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        ) : null}
                        {!prospect.email && !prospect.phone ? (
                          <span className="text-muted-foreground">—</span>
                        ) : null}
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
                      {prospect.source || "—"}
                    </td>
                    <td className="px-2 py-3 text-right font-medium">
                      {formatCurrency(prospect.estimated_amount)}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(prospect.last_contacted_at)}
                    </td>
                    <td className="px-2 py-3">
                      {prospect.github_url ? (
                        <a
                          href={prospect.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative z-10 inline-flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Voir
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="relative z-10 px-2 py-3">
                      <PlanifierRdvButton
                        clientId={prospect.id}
                        clientLabel={displayClientName(prospect)}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-teal-400 hover:bg-teal-500/10 hover:text-teal-300"
                      />
                    </td>
                  </tr>
                );
              })}
            </ResizableTable>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}