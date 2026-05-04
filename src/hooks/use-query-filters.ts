"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

interface UseQueryFiltersOptions {
  defaultPath: string;
  resetPageOnChange?: boolean;
}

interface UpdateFilterOptions {
  allValue?: string;
  resetPage?: boolean;
}

interface UseDebouncedSearchOptions {
  currentValue?: string | null;
  onChange: (value: string) => void;
  delay?: number;
}

export function useQueryFilters({
  defaultPath,
  resetPageOnChange = false,
}: UseQueryFiltersOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pushParams = useCallback(
    (params: URLSearchParams) => {
      const path = pathname || defaultPath;
      const query = params.toString();
      router.push(query ? `${path}?${query}` : path);
    },
    [defaultPath, pathname, router]
  );

  const updateFilter = useCallback(
    (
      key: string,
      value: string | null | undefined,
      { allValue = "all", resetPage }: UpdateFilterOptions = {}
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value && value !== allValue) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      if (resetPage ?? resetPageOnChange) {
        params.delete("page");
      }

      pushParams(params);
    },
    [pushParams, resetPageOnChange, searchParams]
  );

  return {
    updateFilter,
    currentPath: pathname || defaultPath,
  };
}

export function useDebouncedSearchFilter({
  currentValue,
  onChange,
  delay = 400,
}: UseDebouncedSearchOptions) {
  const normalizedCurrent = currentValue || "";

  const debouncedUpdate = useDebouncedCallback((value: string) => {
    onChange(value);
  }, delay);

  const handleSearchChange = useCallback(
    (value: string) => {
      debouncedUpdate(value);
    },
    [debouncedUpdate]
  );

  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  return {
    inputKey: normalizedCurrent,
    defaultValue: normalizedCurrent,
    handleSearchChange,
  };
}