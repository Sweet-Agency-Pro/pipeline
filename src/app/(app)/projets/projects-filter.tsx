"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_STATUS_CONFIG, type ProjectStatus } from "@/types";
import { Search, Filter } from "lucide-react";
import {
  useDebouncedSearchFilter,
  useQueryFilters,
} from "@/hooks/use-query-filters";
import { PROJECT_SORT_OPTIONS } from "@/lib/filter-options";

interface ProjectsFilterProps {
  currentStatus?: string | null;
  currentSearch?: string | null;
  currentSort?: string | null;
}

export function ProjectsFilter({
  currentStatus,
  currentSearch,
  currentSort,
}: ProjectsFilterProps) {
  const { updateFilter } = useQueryFilters({ defaultPath: "/projets" });
  const { inputKey, defaultValue, handleSearchChange } = useDebouncedSearchFilter({
    currentValue: currentSearch,
    onChange: (value) => updateFilter("search", value, { allValue: "" }),
    delay: 300,
  });

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            key={inputKey}
            placeholder="Rechercher un projet, client..."
            className="pl-9 bg-slate-800/50 border-slate-700 text-slate-200"
            defaultValue={defaultValue}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            value={currentStatus || "all"}
            onValueChange={(value) => updateFilter("status", value || "all")}
          >
            <SelectTrigger className="w-full sm:w-fit min-w-[180px] bg-slate-800/50 border-slate-700 text-slate-200 focus:ring-1 focus:ring-slate-500 gap-3">
              <SelectValue>
                {currentStatus === "all" || !currentStatus ? "Tous les statuts" : 
                 PROJECT_STATUS_CONFIG[currentStatus as ProjectStatus]?.label || "Tous les statuts"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 [&>*]:py-1.5">
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(PROJECT_STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={currentSort || "created_at:desc"}
            onValueChange={(value) => updateFilter("sort", value || "created_at:desc")}
          >
            <SelectTrigger className="w-full sm:w-fit min-w-[180px] bg-slate-800/50 border-slate-700 text-slate-200 focus:ring-1 focus:ring-slate-500 gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 opacity-50 text-slate-400" />
                <SelectValue>
                  {PROJECT_SORT_OPTIONS.find((opt) => opt.value === (currentSort || "created_at:desc"))?.label || "Plus récents"}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 [&>*]:py-1.5">
              {PROJECT_SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
