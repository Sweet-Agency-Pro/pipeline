"use client";

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
import {
  useDebouncedSearchFilter,
  useQueryFilters,
} from "@/hooks/use-query-filters";
import { CLIENT_SORT_OPTIONS } from "@/lib/filter-options";

export function ProspectsFilter({
  currentSearch,
  currentSource,
  currentSort,
}: {
  currentSearch?: string;
  currentSource?: string;
  currentSort?: string;
}) {
  const { updateFilter } = useQueryFilters({ defaultPath: "/prospects" });
  const { inputKey, defaultValue, handleSearchChange } = useDebouncedSearchFilter({
    currentValue: currentSearch,
    onChange: (value) => updateFilter("search", value, { allValue: "" }),
  });

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          key={inputKey}
          placeholder="Rechercher un prospect..."
          defaultValue={defaultValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500"
        />
      </div>

      <Select
        value={currentSource || "all"}
        onValueChange={(value: string | null) => updateFilter("source", value ?? "all")}
      >
        <SelectTrigger className="w-full sm:w-fit min-w-[180px] bg-slate-800/50 border-slate-700 text-slate-200">
          <SelectValue>
            {currentSource === "all" || !currentSource ? "Toutes les sources" : currentSource}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
          <SelectItem value="all">Toutes les sources</SelectItem>
          {CLIENT_SOURCES.map((source) => (
            <SelectItem key={source} value={source}>
              {source}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentSort || "created_at:desc"}
        onValueChange={(value: string | null) => updateFilter("sort", value ?? "created_at:desc")}
      >
        <SelectTrigger className="w-full sm:w-fit min-w-[180px] bg-slate-800/50 border-slate-700 text-slate-200">
          <SelectValue>
            {CLIENT_SORT_OPTIONS.find((opt) => opt.value === (currentSort || "created_at:desc"))?.label || "Trier par"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
          {CLIENT_SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
