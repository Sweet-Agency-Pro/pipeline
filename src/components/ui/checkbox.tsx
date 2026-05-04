"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function Checkbox({ checked = false, onCheckedChange, disabled, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "h-4.5 w-4.5 shrink-0 rounded border transition-all duration-150 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30",
        checked
          ? "bg-teal-500 border-teal-500 text-white"
          : "border-slate-600 bg-slate-800/60 hover:border-slate-500",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {checked && <Check className="h-3 w-3 stroke-[3]" />}
    </button>
  );
}

export { Checkbox };
