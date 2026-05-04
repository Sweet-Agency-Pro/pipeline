"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileAudio,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { RendezVous } from "@/types";
import { cn } from "@/lib/utils";
import { useActivityLog } from "@/hooks/use-activity-log";

interface MeetingAudioUploaderProps {
  rdv: RendezVous;
  onComplete: () => void;
  onCancel: () => void;
}

type Step = "idle" | "extracting" | "compressing" | "uploading" | "saving" | "done" | "error";

function sanitizeFileName(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // remove accents
    .replace(/[^a-zA-Z0-9_\- ]/g, "") // keep safe chars
    .replace(/\s+/g, "_")
    .toLowerCase()
    .slice(0, 80);
}

export function MeetingAudioUploader({ rdv, onComplete, onCancel }: MeetingAudioUploaderProps) {
  const supabase = createClient();
  const { log } = useActivityLog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const isVideo = (file: File) => file.type.startsWith("video/") || file.name.endsWith(".mp4");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setStep("idle");
    setErrorMsg("");
  };

  const processAndUpload = useCallback(async () => {
    if (!selectedFile) return;

    console.log("[AudioUploader] Starting process for file:", selectedFile.name, "size:", selectedFile.size);

    try {
      let progressMode: "extracting" | "compressing" = "extracting";

      // ── 1. Load FFmpeg ──
      setStep("extracting");
      setProgress("Chargement de FFmpeg…");
      console.log("[AudioUploader] Loading FFmpeg...");

      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress: p }) => {
        const pct = Math.round(p * 100);
        if (progressMode === "extracting") {
          setProgress(`Extraction audio… ${pct}%`);
        } else {
          setProgress(`Compression… ${pct}%`);
        }
      });

      const baseURL = window.location.origin + "/ffmpeg/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      console.log("[AudioUploader] FFmpeg loaded successfully");

      const inputName = "input" + (isVideo(selectedFile) ? ".mp4" : ".mp3");
      console.log("[AudioUploader] Writing file to FFmpeg FS:", inputName);
      await ffmpeg.writeFile(inputName, await fetchFile(selectedFile));

      // ── 2. Extract audio from video (if needed) ──
      let audioInput = inputName;
      if (isVideo(selectedFile)) {
        setStep("extracting");
        setProgress("Extraction de l'audio depuis la vidéo…");
        console.log("[AudioUploader] Video detected, extracting audio...");
        await ffmpeg.exec(["-i", inputName, "-vn", "-acodec", "copy", "extracted.mp3"]);
        audioInput = "extracted.mp3";
        console.log("[AudioUploader] Audio extracted");
      }

      // ── 3. Compress ──
      progressMode = "compressing";
      setStep("compressing");
      setProgress("Compression audio…");
      console.log("[AudioUploader] Starting compression to 64k mono mp3...");
      await ffmpeg.exec([
        "-i", audioInput,
        "-acodec", "libmp3lame",
        "-ar", "16000",
        "-ac", "1",
        "-b:a", "64k",
        "output.mp3",
      ]);
      console.log("[AudioUploader] Compression finished");

      console.log("[AudioUploader] Reading output file from FFmpeg FS...");
      const fileData = await ffmpeg.readFile("output.mp3");
      // Copy to regular ArrayBuffer to avoid SharedArrayBuffer issues
      const audioBytes = new Uint8Array(fileData as Uint8Array);
      const blob = new Blob([audioBytes], { type: "audio/mpeg" });
      console.log("[AudioUploader] Output blob created, size:", blob.size);

      // ── 4. Upload to Supabase storage ──
      setStep("uploading");
      setProgress("Upload vers le serveur…");

      const objectName = `${sanitizeFileName(rdv.title)}_${rdv.id.slice(0, 8)}.mp3`;
      console.log("[AudioUploader] Uploading to Supabase Storage:", objectName);
      const { error: uploadError } = await supabase.storage
        .from("audio_meetings")
        .upload(objectName, blob, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("[AudioUploader] Storage upload error:", uploadError);
        throw new Error(`Upload échoué: ${uploadError.message}`);
      }
      console.log("[AudioUploader] File uploaded successfully");

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("audio_meetings")
        .getPublicUrl(objectName);

      const filePath = urlData?.publicUrl || objectName;
      console.log("[AudioUploader] Public URL:", filePath);

      // ── 5. Create meeting row ──
      setStep("saving");
      setProgress("Enregistrement en base de données…");
      console.log("[AudioUploader] Creating meeting row in database...");

      const { error: insertError } = await supabase.from("meetings").insert({
        rdv_id: rdv.id,
        file_path: filePath,
        status: "uploaded",
      });

      if (insertError) {
        console.error("[AudioUploader] Database insert error:", insertError);
        throw new Error(`Erreur DB: ${insertError.message}`);
      }
      console.log("[AudioUploader] Meeting row created");

      await log(
        `a ajouté un fichier audio au rendez-vous "${rdv.title}"`,
        "rendez_vous",
        rdv.id
      );

      setStep("done");
      setProgress("Terminé !");
      console.log("[AudioUploader] Process complete!");

      // Small delay to show success state
      setTimeout(onComplete, 1200);
    } catch (err: unknown) {
      console.error("[AudioUploader] Global error:", err);
      setStep("error");
      setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }, [selectedFile, rdv, supabase, onComplete, log]);

  const stepLabels: Record<Step, string> = {
    idle: "",
    extracting: "Extraction",
    compressing: "Compression",
    uploading: "Upload",
    saving: "Sauvegarde",
    done: "Terminé",
    error: "Erreur",
  };

  const isProcessing = ["extracting", "compressing", "uploading", "saving"].includes(step);

  return (
    <div className="space-y-5">
      {/* File picker */}
      <div
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
          selectedFile
            ? "border-teal-500/40 bg-teal-500/5"
            : "border-slate-700/60 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50",
          isProcessing && "opacity-50 pointer-events-none"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.mp4,audio/mpeg,video/mp4"
          onChange={handleFileChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <FileAudio className="h-8 w-8 text-teal-400" />
            <div className="text-left">
              <p className="text-sm font-semibold text-teal-300 truncate max-w-[300px]">{selectedFile.name}</p>
              <p className="text-xs text-slate-500">
                {(selectedFile.size / (1024 * 1024)).toFixed(1)} Mo • Cliquez pour changer
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 text-slate-500 mx-auto" />
            <p className="text-sm text-slate-400">Cliquez pour sélectionner un fichier</p>
            <p className="text-xs text-slate-600">Formats acceptés : .mp3, .mp4</p>
          </div>
        )}
      </div>

      {/* Progress */}
      {isProcessing && (
        <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <Loader2 className="h-5 w-5 animate-spin text-teal-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200">{stepLabels[step]}</p>
            <p className="text-xs text-slate-500">{progress}</p>
          </div>
        </div>
      )}

      {/* Success */}
      {step === "done" && (
        <div className="flex items-center gap-3 p-4 bg-teal-500/10 rounded-xl border border-teal-500/30">
          <CheckCircle2 className="h-5 w-5 text-teal-400 shrink-0" />
          <p className="text-sm font-medium text-teal-300">Audio uploadé avec succès !</p>
        </div>
      )}

      {/* Error */}
      {step === "error" && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 rounded-xl border border-red-500/30">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-300">Échec du traitement</p>
            <p className="text-xs text-red-400/70">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isProcessing}
          className="text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        >
          Annuler
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={processAndUpload}
          disabled={!selectedFile || isProcessing || step === "done"}
          className="bg-teal-500 text-white hover:bg-teal-600 border-0 shadow-sm shadow-teal-500/20"
        >
          {isProcessing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-3.5 w-3.5" />
          )}
          {isProcessing ? "Traitement…" : "Traiter et uploader"}
        </Button>
      </div>
    </div>
  );
}
