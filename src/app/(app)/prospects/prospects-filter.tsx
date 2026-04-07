"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLIENT_SOURCES } from "@/types";
import { Search } from "lucide-react";

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Plus récent" },
  { value: "created_at:asc", label: "Plus ancien" },
  { value: "last_name:asc", label: "Nom A→Z" },
  { value: "last_name:desc", label: "Nom Z→A" },
  { value: "estimated_amount:desc", label: "Montant ↓" },
  { value: "estimated_amount:asc", label: "Montant ↑" },
];

export function ProspectsFilter({
  currentSearch,
  currentSource,
  currentSort,
}: {
  currentSearch?: string;
  currentSource?: string;
  currentSort?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/prospects?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un prospect..."
          defaultValue={currentSearch}
          onChange={(e) => {
            const timeout = setTimeout(() => {
              updateFilter("search", e.target.value);
            }, 300);
            return () => clearTimeout(timeout);
          }}
          className="pl-9"
        />
      </div>
      <Select
        defaultValue={currentSource || "all"}
        onValueChange={(value) => updateFilter("source", value)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Toutes les sources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les sources</SelectItem>
          {CLIENT_SOURCES.map((source) => (
            <SelectItem key={source} value={source}>
              {source}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={currentSort || "created_at:desc"}
        onValueChange={(value) => updateFilter("sort", value)}
      >
        <SelectTrigger className="w-full sm:w-[170px]">
          <SelectValue placeholder="Trier par" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
