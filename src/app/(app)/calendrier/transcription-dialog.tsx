"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollText, X, Copy, Check } from "lucide-react";
import { useState } from "react";

interface TranscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  transcription: string;
  title: string;
}

export function TranscriptionDialog({
  open,
  onClose,
  transcription,
  title,
}: TranscriptionDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700/60 text-slate-200 sm:max-w-3xl p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-teal-400" />
              Transcription — {title}
            </DialogTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="text-slate-400 hover:text-teal-400 hover:bg-teal-500/10"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-teal-400" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copier
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-5">
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
              {transcription}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 px-6 py-4 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
