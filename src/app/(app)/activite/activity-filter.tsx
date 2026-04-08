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
import { Search } from "lucide-react";

const ENTITY_TYPES = [
  { value: "client", label: "Client" },
  { value: "project", label: "Projet" },
];

export function ActivityFilter({
  currentSearch,
  currentEntityType,
}: {
  currentSearch?: string;
  currentEntityType?: string;
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
    params.delete("page");
    router.push(`/activite?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher une action..."
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
        defaultValue={currentEntityType || "all"}
        onValueChange={(value: string | null) => updateFilter("entity_type", value ?? "all")}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Tous les types" />
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
