"use client";

import { useState, useCallback, useRef } from "react";
import type { Profile } from "@/types";
import { useSupabaseClient } from "@/hooks/use-supabase-client";
import { getClientLabel } from "@/lib/utils";

interface RdvFormData {
  profiles: Profile[];
  clients: { id: string; label: string }[];
  calendarIds: string[];
}

/**
 * Hook centralisé pour charger les données nécessaires au formulaire de RDV.
 * Remplace les 3 copies identiques de loadRdvData() dans :
 * - planifier-rdv-button.tsx
 * - clients/nouveau/page.tsx
 * - prospects/nouveau/page.tsx
 */
export function useRdvFormData() {
  const supabase = useSupabaseClient();
  const [data, setData] = useState<RdvFormData>({
    profiles: [],
    clients: [],
    calendarIds: [],
  });
  const [loaded, setLoaded] = useState(false);
  const loadingRef = useRef(false);

  const load = useCallback(async (): Promise<RdvFormData> => {
    if (loaded) return data;
    if (loadingRef.current) return data;
    loadingRef.current = true;

    const [profilesRes, clientsRes, configRes] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase
        .from("clients")
        .select("id, first_name, last_name, company")
        .neq("status", "perdu")
        .order("last_name"),
      fetch("/api/calendar/config").then((r) => r.json()),
    ]);

    const result: RdvFormData = {
      profiles: (profilesRes.data as Profile[]) || [],
      clients:
        clientsRes.data?.map(
          (c: {
            id: string;
            first_name: string;
            last_name: string;
            company?: string;
          }) => ({
            id: c.id,
            label: getClientLabel(c),
          })
        ) || [],
      calendarIds: configRes.calendarIds || [],
    };

    setData(result);
    setLoaded(true);
    loadingRef.current = false;
    return result;
  }, [supabase, loaded, data]);

  return { ...data, loaded, load };
}
