"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import {
  useDebouncedSearchFilter,
  useQueryFilters,
} from "@/hooks/use-query-filters";

const ENTITY_TYPES = [
  { value: "client", label: "Client" },
  { value: "project", label: "Projet" },
  { value: "prospect", label: "Prospect" },
  { value: "rendez_vous", label: "Rendez-vous" },
];

export function ActivityFilter({
  currentSearch,
  currentEntityType,
}: {
  currentSearch?: string;
  currentEntityType?: string;
}) {
  const { updateFilter } = useQueryFilters({
    defaultPath: "/activite",
    resetPageOnChange: true,
  });
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
          placeholder="Rechercher une action..."
          defaultValue={defaultValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 bg-slate-800/50 border-slate-700 text-slate-200"
        />
      </div>
      <Select
        value={currentEntityType || "all"}
        onValueChange={(value: string | null) => updateFilter("entity_type", value ?? "all")}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue>
            {!currentEntityType || currentEntityType === "all"
              ? "Tous les types"
              : ENTITY_TYPES.find((t) => t.value === currentEntityType)?.label || "Tous les types"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          {ENTITY_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
