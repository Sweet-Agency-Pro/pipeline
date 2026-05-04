"use client";

import { useCallback, useRef } from "react";
import { useSupabaseClient } from "@/hooks/use-supabase-client";

/**
 * Hook centralisé pour logger les actions dans la table `activity_log`.
 * Évite de dupliquer `getUser() + insert()` dans chaque composant.
 */
export function useActivityLog() {
  const supabase = useSupabaseClient();
  const userCache = useRef<{ id: string } | null>(null);

  const getUserId = useCallback(async (): Promise<string | undefined> => {
    if (userCache.current) return userCache.current.id;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userCache.current = { id: user.id };
    return user?.id;
  }, [supabase]);

  const log = useCallback(
    async (
      action: string,
      entityType: "client" | "project" | "prospect" | "rendez_vous",
      entityId?: string | null
    ) => {
      const userId = await getUserId();
      await supabase.from("activity_log").insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
      });
    },
    [supabase, getUserId]
  );

  return { log, getUserId };
}
