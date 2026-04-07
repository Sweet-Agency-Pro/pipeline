"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Loader2, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

interface CsvRow {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  estimated_amount?: string;
  notes?: string;
  status?: string;
}

// Column mapping: normalized header → target field
const HEADER_MAP: Record<string, string> = {
  // Standard / French format
  prenom: "first_name",
  prénom: "first_name",
  first_name: "first_name",
  nom: "company",       // Google Maps "Nom" = company name
  last_name: "last_name",
  email: "email",
  telephone: "phone",
  téléphone: "phone",
  tel: "phone",
  phone: "phone",
  phone_number: "phone",
  entreprise: "company",
  company: "company",
  source: "source",
  place_type: "source",
  montant: "estimated_amount",
  montant_estime: "estimated_amount",
  estimated_amount: "estimated_amount",
  notes: "notes",
  address: "address",
  google_maps_url: "google_maps_url",
  reviews_average: "reviews_average",
  reviews_count: "reviews_count",
  "état": "etat_raw",
  etat: "etat_raw",
  status: "etat_raw",
};

const ETAT_TO_STATUS: Record<string, string> = {
  "pas contacté": "prospect",
  "pas contacte": "prospect",
  "pas répondu": "prospect",
  "pas repondu": "prospect",
  "refusé": "perdu",
  "refuse": "perdu",
  "accepté": "gagne",
  "accepte": "gagne",
  "peut-être": "proposition",
  "peut-etre": "proposition",
  "peut être": "proposition",
  "intéressé": "negociation",
  "interesse": "negociation",
  "contacté": "contacte",
  "contacte": "contacte",
};

const TARGET_FIELDS = [
  "first_name", "last_name", "email", "phone", "company",
  "source", "estimated_amount", "notes", "etat_raw",
  // Extra fields we'll merge into notes
  "address", "google_maps_url", "reviews_average", "reviews_count",
];

function detectSeparator(headerLine: string): string {
  if (headerLine.includes("\t")) return "\t";
  if (headerLine.includes(";")) return ";";
  return ",";
}

function isGoogleMapsFormat(headers: string[]): boolean {
  return headers.some((h) => ["phone_number", "place_type", "google_maps_url", "reviews_average"].includes(h));
}

function splitLine(line: string, sep: string): string[] {
  // For TSV: tabs never appear inside values, simple split
  if (sep === "\t") {
    return line.split("\t").map((v) => v.trim().replace(/^"|"$/g, ""));
  }
  // For CSV: quote-aware split
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === sep && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/^"|"$/g, ""));
  return values;
}

/**
 * Merge continuation lines that belong to multi-line fields.
 * For TSV: a line with fewer tabs than expected is a continuation.
 * For CSV: tracks quote parity to merge quoted multi-line fields.
 */
function mergeMultilineRows(lines: string[], sep: string, expectedCols: number): string[] {
  const merged: string[] = [];

  if (sep === "\t") {
    const expectedTabs = expectedCols - 1;
    for (const line of lines) {
      const tabCount = (line.match(/\t/g) || []).length;
      if (merged.length > 0 && tabCount < expectedTabs) {
        merged[merged.length - 1] += " " + line.trim();
      } else if (line.trim()) {
        merged.push(line);
      }
    }
  } else {
    let buffer = "";
    let openQuotes = false;
    for (const line of lines) {
      if (!line.trim() && !openQuotes) continue;
      if (openQuotes) {
        buffer += " " + line.trim();
      } else {
        if (buffer) merged.push(buffer);
        buffer = line;
      }
      const quoteCount = (line.match(/"/g) || []).length;
      if (quoteCount % 2 === 1) {
        openQuotes = !openQuotes;
      }
    }
    if (buffer) merged.push(buffer);
  }

  return merged;
}

function parseCsv(text: string): { rows: CsvRow[]; errors: string[] } {
  const errors: string[] = [];
  const rawLines = text.trim().split(/\r?\n/);

  if (rawLines.length < 2) {
    errors.push("Le fichier doit contenir au moins un en-tête et une ligne de données.");
    return { rows: [], errors };
  }

  const sep = detectSeparator(rawLines[0]);
  const rawHeaders = splitLine(rawLines[0], sep).map((h) => h.toLowerCase().trim());
  const isGMaps = isGoogleMapsFormat(rawHeaders);
  const expectedCols = rawHeaders.length;

  // Merge continuation lines (multi-line Notes fields)
  const dataLines = mergeMultilineRows(rawLines.slice(1), sep, expectedCols);

  // Map headers
  const mappedHeaders = rawHeaders.map((h) => HEADER_MAP[h] || h);

  // Validate: need at least a name column
  const hasName = mappedHeaders.includes("company") || mappedHeaders.includes("last_name") || mappedHeaders.includes("first_name");
  if (!hasName) {
    errors.push("Aucune colonne de nom détectée (Nom, last_name, prenom, entreprise...).");
    return { rows: [], errors };
  }

  const rows: CsvRow[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < dataLines.length; i++) {
    const values = splitLine(dataLines[i], sep);
    const raw: Record<string, string> = {};
    mappedHeaders.forEach((header, idx) => {
      if (TARGET_FIELDS.includes(header) && values[idx]) {
        raw[header] = values[idx];
      }
    });

    // Build the row depending on format
    if (isGMaps) {
      // Google Maps export: "Nom" = company, no first/last name
      const company = raw.company || "";
      if (!company) {
        errors.push(`Ligne ${i + 2}: nom manquant.`);
        continue;
      }

      // Aggregate extra info into notes
      const noteParts: string[] = [];
      if (raw.notes) noteParts.push(raw.notes);
      if (raw.address) noteParts.push(`Adresse : ${raw.address}`);
      if (raw.google_maps_url) noteParts.push(`Google Maps : ${raw.google_maps_url}`);
      if (raw.reviews_average || raw.reviews_count) {
        noteParts.push(`Avis : ${raw.reviews_average || "—"}/5 (${raw.reviews_count || 0} avis)`);
      }
      if (raw.source) noteParts.push(`Type : ${raw.source}`);

      const status = raw.etat_raw
        ? ETAT_TO_STATUS[raw.etat_raw.toLowerCase().trim()] || "prospect"
        : "prospect";

      const dedup = `${company}|${raw.phone || ""}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);

      rows.push({
        first_name: "",
        last_name: company,
        company,
        phone: raw.phone,
        notes: noteParts.length > 0 ? noteParts.join("\n") : undefined,
        status,
      });
    } else {
      // Standard format
      if (!raw.first_name && !raw.last_name) {
        errors.push(`Ligne ${i + 2}: prénom ou nom requis.`);
        continue;
      }
      const status = raw.etat_raw
        ? ETAT_TO_STATUS[raw.etat_raw.toLowerCase().trim()] || "prospect"
        : "prospect";

      const dedup = `${raw.first_name || ""}|${raw.last_name || ""}|${raw.phone || ""}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);

      rows.push({
        first_name: raw.first_name || "-",
        last_name: raw.last_name || "-",
        email: raw.email,
        phone: raw.phone,
        company: raw.company,
        source: raw.source,
        estimated_amount: raw.estimated_amount,
        notes: raw.notes,
        status,
      });
    }
  }

  return { rows, errors };
}

export function CsvImport() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<CsvRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setParseErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { rows, errors } = parseCsv(text);
      setParseErrors(errors);
      setPreview(rows);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!preview || preview.length === 0) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let success = 0;
    let failed = 0;

    for (const row of preview) {
      const { error } = await supabase.from("clients").insert({
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email || null,
        phone: row.phone || null,
        company: row.company || null,
        source: row.source || null,
        estimated_amount: parseFloat(row.estimated_amount || "0") || 0,
        notes: row.notes || null,
        status: row.status || "prospect",
        created_by: user?.id,
        assigned_to: user?.id,
      });

      if (error) {
        failed++;
      } else {
        success++;
      }
    }

    // Log activity
    if (success > 0 && user) {
      await supabase.from("activity_log").insert({
        user_id: user.id,
        action: `Import CSV : ${success} prospect(s) ajouté(s)`,
        entity_type: "client",
      });
    }

    setResult({ success, failed });
    setLoading(false);
    setPreview(null);

    if (success > 0) {
      router.refresh();
    }
  }

  function handleClose() {
    setOpen(false);
    setPreview(null);
    setParseErrors([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-slate-700 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer">
        <Upload className="h-4 w-4" />
        Importer CSV
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl bg-slate-800 border-slate-700 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white">Importer des prospects</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-dashed border-slate-600 p-6 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm text-slate-400 mb-3">
              Formats acceptés : <span className="text-slate-300">export Google Maps</span> (TSV) ou <span className="text-slate-300">CSV standard</span> (prenom, nom, email, telephone, entreprise)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-500/20 file:text-teal-400 hover:file:bg-teal-500/30 file:cursor-pointer"
            />
          </div>

          {parseErrors.length > 0 && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 space-y-1">
              {parseErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {err}
                </div>
              ))}
            </div>
          )}

          {preview && preview.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                <span className="font-medium text-teal-400">{preview.length}</span> prospect(s) détecté(s)
              </p>
              <div className="max-h-48 overflow-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-slate-700/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-slate-300 w-[45%]">Nom</th>
                      <th className="px-3 py-1.5 text-left text-slate-300 w-[35%]">Entreprise</th>
                      <th className="px-3 py-1.5 text-left text-slate-300 w-[20%]">Téléphone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-slate-700/50">
                        <td className="px-3 py-1.5 text-slate-300 truncate">{row.first_name && row.first_name !== "-" ? `${row.first_name} ${row.last_name}` : row.company || row.last_name}</td>
                        <td className="px-3 py-1.5 text-slate-400 truncate">{row.company || "—"}</td>
                        <td className="px-3 py-1.5 text-slate-400 truncate">{row.phone || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                onClick={handleImport}
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 border-0"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importer {preview.length} prospect(s)
              </Button>
            </div>
          )}

          {result && (
            <div className="rounded-lg bg-teal-500/10 border border-teal-500/20 p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm text-teal-400">
                <CheckCircle2 className="h-4 w-4" />
                {result.success} prospect(s) importé(s) avec succès
              </div>
              {result.failed > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {result.failed} échec(s)
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
