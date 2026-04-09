"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { NouveauRdvDialog } from "@/app/(app)/calendrier/nouveau-rdv-dialog";
import type { Profile } from "@/types";

interface PlanifierRdvButtonProps {
  clientId: string;
  clientLabel: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
  className?: string;
  disabled?: boolean;
}

export function PlanifierRdvButton({ clientId, clientLabel, variant = "outline", size = "sm", className, disabled }: PlanifierRdvButtonProps) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<{ id: string; label: string }[]>([]);
  const [calendarIds, setCalendarIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadData = useCallback(async () => {
    if (loaded) return;
    const supabase = createClient();

    const [profilesRes, clientsRes, configRes] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("clients").select("id, first_name, last_name, company").neq("status", "perdu").order("last_name"),
      fetch("/api/calendar/config").then((r) => r.json()),
    ]);

    setProfiles((profilesRes.data as Profile[]) || []);
    setClients(
      clientsRes.data?.map((c: { id: string; first_name: string; last_name: string; company?: string }) => ({
        id: c.id,
        label: `${c.first_name} ${c.last_name}${c.company ? ` (${c.company})` : ""}`,
      })) || []
    );
    setCalendarIds(configRes.calendarIds || []);
    setLoaded(true);
  }, [loaded]);

  const handleClick = async () => {
    await loadData();
    setOpen(true);
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={handleClick} className={className} disabled={disabled}>
        <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
        Fixer un RDV
      </Button>

      {loaded && (
        <NouveauRdvDialog
          open={open}
          onClose={() => setOpen(false)}
          onCreated={() => setOpen(false)}
          profiles={profiles}
          clients={clients}
          calendarIds={calendarIds}
          defaultClientId={clientId}
        />
      )}
    </>
  );
}
