"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleSearch = useDebouncedCallback((term: string) => {
    router.push(`${pathname || ""}?${createQueryString("search", term)}`);
  }, 300);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Rechercher un projet, client..."
            className="pl-9 bg-slate-800/50 border-slate-700 text-slate-200"
            defaultValue={currentSearch || ""}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            value={currentStatus || "all"}
            onValueChange={(value) =>
              router.push(`${pathname || ""}?${createQueryString("status", value || "all")}`)
            }
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
            onValueChange={(value) =>
              router.push(`${pathname || ""}?${createQueryString("sort", value || "created_at:desc")}`)
            }
          >
            <SelectTrigger className="w-full sm:w-fit min-w-[180px] bg-slate-800/50 border-slate-700 text-slate-200 focus:ring-1 focus:ring-slate-500 gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 opacity-50 text-slate-400" />
                <SelectValue>
                  {currentSort === "created_at:desc" || !currentSort ? "Plus récents" : 
                   currentSort === "created_at:asc" ? "Plus anciens" :
                   currentSort === "budget:desc" ? "Plus gros budget" :
                   currentSort === "budget:asc" ? "Budget croissant" :
                   currentSort === "name:asc" ? "Nom (A-Z)" :
                   currentSort === "deadline:asc" ? "Échéance proche" : "Plus récents"}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 [&>*]:py-1.5">
              <SelectItem value="created_at:desc">Plus récents</SelectItem>
              <SelectItem value="created_at:asc">Plus anciens</SelectItem>
              <SelectItem value="budget:desc">Plus gros budget</SelectItem>
              <SelectItem value="name:asc">Nom (A-Z)</SelectItem>
              <SelectItem value="deadline:asc">Échéance proche</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
