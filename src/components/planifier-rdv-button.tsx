"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { NouveauRdvDialog } from "@/app/(app)/calendrier/nouveau-rdv-dialog";
import { useRdvFormData } from "@/hooks/use-rdv-form-data";

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
  const rdvData = useRdvFormData();

  const handleClick = async () => {
    await rdvData.load();
    setOpen(true);
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={handleClick} className={className} disabled={disabled}>
        <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
        Fixer un RDV
      </Button>

      {rdvData.loaded && (
        <NouveauRdvDialog
          open={open}
          onClose={() => setOpen(false)}
          onCreated={() => setOpen(false)}
          profiles={rdvData.profiles}
          clients={rdvData.clients}
          calendarIds={rdvData.calendarIds}
          defaultClientId={clientId}
        />
      )}
    </>
  );
}
