"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileAudio,
  Loader2,
  Upload,
  AlertCircle,
  FileText,
  Sparkles,
  LayoutList,
  CheckSquare,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Target,
  Mail,
  Phone,
  Users,
  HelpCircle,
  ChevronRight,
  X,
  MessageSquare,
  Layers,
} from "lucide-react";
import type { Meeting, MeetingSummary, NextStep, RendezVous, TodoItem } from "@/types";
import { cn } from "@/lib/utils";
import { MeetingAudioUploader } from "./meeting-audio-uploader";
import { TranscriptionDialog } from "./transcription-dialog";

interface MeetingRetourDialogProps {
  rdv: RendezVous;
  open: boolean;
  onClose: () => void;
}

type TabId = "summary" | "elements" | "tasks" | "nextsteps";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "summary", label: "Résumé", icon: Sparkles },
  { id: "elements", label: "Présentés", icon: Layers },
  { id: "tasks", label: "Tâches", icon: CheckSquare },
  { id: "nextsteps", label: "Étapes", icon: ArrowRight },
];

// ── Priority pill ──
const PRIORITY: Record<string, { dot: string; label: string }> = {
  high: { dot: "bg-red-500", label: "Haute" },
  normal: { dot: "bg-amber-400", label: "Normal" },
  low: { dot: "bg-slate-500", label: "Basse" },
};

// ── Category badge ──
const CATEGORY: Record<string, { label: string; cls: string }> = {
  contenu: { label: "Contenu", cls: "bg-blue-500/15 text-blue-400 ring-blue-500/30" },
  design: { label: "Design", cls: "bg-violet-500/15 text-violet-400 ring-violet-500/30" },
  services: { label: "Services", cls: "bg-teal-500/15 text-teal-400 ring-teal-500/30" },
  technique: { label: "Technique", cls: "bg-orange-500/15 text-orange-400 ring-orange-500/30" },
  commercial: { label: "Commercial", cls: "bg-pink-500/15 text-pink-400 ring-pink-500/30" },
};

// ── Channel icon ──
function ChannelIcon({ ch }: { ch: string }) {
  const cls = "h-4 w-4 shrink-0";
  if (ch === "mail") return <Mail className={cls} />;
  if (ch === "téléphone") return <Phone className={cls} />;
  if (ch === "réunion") return <Users className={cls} />;
  return <HelpCircle className={cls} />;
}

// ─────────────────────────────────────────────────────────
//  TAB: Résumé
// ─────────────────────────────────────────────────────────
function SummaryTab({ summary }: { summary: MeetingSummary | null }) {
  if (!summary) {
    return <Empty text="Aucun résumé disponible" />;
  }

  const s = (summary as unknown as { summary?: MeetingSummary }).summary ?? summary;

  return (
    <div className="space-y-5">
      {/* Context bubble */}
      {s.context && (
        <div className="relative pl-4">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-gradient-to-b from-violet-500 to-teal-500" />
          <p className="text-sm text-slate-300 leading-relaxed italic">{s.context}</p>
        </div>
      )}

      {/* Overall feeling */}
      {s.overall_feeling && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <MessageSquare className="h-4 w-4 text-teal-400 shrink-0" />
          <p className="text-sm text-slate-200">{s.overall_feeling}</p>
        </div>
      )}

      {/* Two-column grid: validated + pain */}
      {(s.validated_points?.length > 0 || s.pain_points?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {s.validated_points?.length > 0 && (
            <ItemGroup
              icon={ThumbsUp}
              title="Points validés"
              accent="teal"
              items={s.validated_points}
              iconColor="text-teal-400"
              dotColor="bg-teal-500"
            />
          )}
          {s.pain_points?.length > 0 && (
            <ItemGroup
              icon={ThumbsDown}
              title="Points de friction"
              accent="red"
              items={s.pain_points}
              iconColor="text-red-400"
              dotColor="bg-red-500"
            />
          )}
        </div>
      )}

      {/* Expectations */}
      {s.clarified_expectations?.length > 0 && (
        <ItemGroup
          icon={Target}
          title="Attentes clarifiées"
          accent="violet"
          items={s.clarified_expectations}
          iconColor="text-violet-400"
          dotColor="bg-violet-500"
        />
      )}
    </div>
  );
}

function ItemGroup({
  icon: Icon,
  title,
  items,
  iconColor,
  dotColor,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
  iconColor: string;
  dotColor: string;
  accent: string;
}) {
  const bgMap: Record<string, string> = {
    teal: "bg-teal-500/8 border-teal-500/20",
    red: "bg-red-500/8 border-red-500/20",
    violet: "bg-violet-500/8 border-violet-500/20",
    blue: "bg-blue-500/8 border-blue-500/20",
  };

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", bgMap[accent] ?? "bg-slate-800/50 border-slate-700/40")}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
        <span className={cn("text-xs font-bold uppercase tracking-widest", iconColor)}>{title}</span>
        <span className="ml-auto text-[10px] text-slate-600 font-medium">{items.length}</span>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
            <span className="text-[13px] text-slate-300 leading-snug">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  TAB: Éléments présentés
// ─────────────────────────────────────────────────────────
function ElementsTab({ items }: { items: string[] | null }) {
  if (!items || items.length === 0) return <Empty text="Aucun élément présenté" />;

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div
          key={i}
          className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/60 hover:bg-slate-800/80 transition-all duration-150"
        >
          <span className="shrink-0 h-5 w-5 rounded-md bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
            {i + 1}
          </span>
          <span className="text-sm text-slate-300 flex-1">{item}</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  TAB: Tâches
// ─────────────────────────────────────────────────────────
function TasksTab({ items }: { items: TodoItem[] | null }) {
  if (!items || items.length === 0) return <Empty text="Aucune tâche" />;

  const groups = [
    { key: "high", items: items.filter(t => t.priority === "high") },
    { key: "normal", items: items.filter(t => t.priority === "normal") },
    { key: "low", items: items.filter(t => t.priority === "low") },
  ].filter(g => g.items.length > 0);

  const highCount = items.filter(t => t.priority === "high").length;
  const normalCount = items.filter(t => t.priority === "normal").length;
  const lowCount = items.filter(t => t.priority === "low").length;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex items-center gap-3 text-xs text-slate-500 px-1">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          {highCount} haute{highCount > 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          {normalCount} normale{normalCount > 1 ? "s" : ""}
        </span>
        {lowCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            {lowCount} basse{lowCount > 1 ? "s" : ""}
          </span>
        )}
        <span className="ml-auto font-medium text-slate-400">{items.length} tâches au total</span>
      </div>

      {groups.map(({ key, items: groupItems }) => {
        const p = PRIORITY[key];
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className={cn("h-2 w-2 rounded-full shrink-0", p.dot)} />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                {p.label}
              </span>
            </div>
            {groupItems.map((task, i) => {
              const cat = CATEGORY[task.category] ?? { label: task.category, cls: "bg-slate-700/50 text-slate-400 ring-slate-600/30" };
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 transition-colors duration-150"
                >
                  <span className={cn("mt-0.5 h-2 w-2 rounded-full shrink-0", p.dot)} />
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm text-slate-200 leading-snug">{task.action}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset", cat.cls)}>
                        {cat.label}
                      </span>
                      {task.responsible && (
                        <span className="text-[11px] text-slate-500">→ {task.responsible}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  TAB: Prochaines étapes
// ─────────────────────────────────────────────────────────
function NextStepsTab({ items }: { items: NextStep[] | null }) {
  if (!items || items.length === 0) return <Empty text="Aucune prochaine étape" />;

  const channelLabel: Record<string, string> = {
    mail: "E-mail",
    téléphone: "Téléphone",
    réunion: "Réunion",
    autre: "Autre",
  };
  const channelColor: Record<string, string> = {
    mail: "text-blue-400  bg-blue-500/10  border-blue-500/20",
    téléphone: "text-teal-400  bg-teal-500/10  border-teal-500/20",
    réunion: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    autre: "text-slate-400 bg-slate-700/50 border-slate-600/30",
  };

  return (
    <div className="space-y-3">
      {items.map((step, i) => {
        const chCls = channelColor[step.channel] ?? channelColor.autre;
        return (
          <div
            key={i}
            className="flex items-start gap-4 px-4 py-4 rounded-xl bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 transition-colors duration-150"
          >
            {/* Step number */}
            <div className="shrink-0 h-7 w-7 rounded-full bg-slate-700/80 flex items-center justify-center text-xs font-bold text-slate-300">
              {i + 1}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm text-slate-200 leading-snug">{step.action}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Channel badge */}
                <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md border", chCls)}>
                  <ChannelIcon ch={step.channel} />
                  {channelLabel[step.channel] ?? step.channel}
                </span>
                {/* Responsible */}
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span className="h-1 w-1 rounded-full bg-slate-600" />
                  {step.responsible}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Empty state
// ─────────────────────────────────────────────────────────
function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-slate-600 italic">{text}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────
export function MeetingRetourDialog({ rdv, open, onClose }: MeetingRetourDialogProps) {
  const supabase = createClient();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [noMeeting, setNoMeeting] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("summary");

  const fetchMeeting = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("meetings")
      .select("*")
      .eq("rdv_id", rdv.id)
      .maybeSingle();

    if (data) {
      setMeeting(data as Meeting);
      setNoMeeting(false);
    } else {
      setMeeting(null);
      setNoMeeting(true);
    }
    setLoading(false);
  }, [rdv.id, supabase]);

  useEffect(() => {
    if (open) {
      setActiveTab("summary");
      fetchMeeting();
    }
  }, [open, fetchMeeting]);

  const handleUploadComplete = () => {
    setShowUploader(false);
    fetchMeeting();
  };

  // ── Loading ──
  if (loading) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="bg-[#0a0f1e] border-slate-800 text-slate-200 sm:max-w-xl p-0 gap-0 overflow-hidden">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-teal-400" />
            <span className="ml-3 text-slate-400 text-sm">Chargement…</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── No meeting → upload prompt ──
  if (noMeeting && !showUploader) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="bg-[#0a0f1e] border-slate-800 text-slate-200 sm:max-w-md p-0 gap-0 overflow-hidden">
          <div className="px-8 pt-10 pb-8 text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-amber-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-white">Aucun enregistrement</h3>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
                Aucun audio n&apos;a été ajouté pour le rendez-vous{" "}
                <span className="font-medium text-slate-200">&quot;{rdv.title}&quot;</span>.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                Fermer
              </Button>
              <Button
                size="sm"
                onClick={() => setShowUploader(true)}
                className="bg-teal-500 text-white hover:bg-teal-400 border-0 shadow-lg shadow-teal-500/20"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Ajouter un audio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Uploader ──
  if (showUploader) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="bg-[#0a0f1e] border-slate-800 text-slate-200 sm:max-w-lg p-0 gap-0 overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-slate-800 flex items-center justify-between">
            <p className="text-base font-semibold text-white">Ajouter un enregistrement</p>
          </div>
          <div className="p-6">
            <MeetingAudioUploader
              rdv={rdv}
              onComplete={handleUploadComplete}
              onCancel={() => { setShowUploader(false); if (noMeeting) onClose(); }}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Tab badge counts ──
  const todoItems = (meeting?.todo_list as TodoItem[] | null) ?? [];
  const nextItems = (meeting?.next_steps as NextStep[] | null) ?? [];
  const elemItems = (meeting?.presented_elements as string[] | null) ?? [];

  const tabBadge: Record<TabId, number | undefined> = {
    summary: undefined,
    elements: elemItems.length || undefined,
    tasks: todoItems.length || undefined,
    nextsteps: nextItems.length || undefined,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="bg-[#0a0f1e] border-slate-800 text-slate-200 sm:max-w-2xl p-0 gap-0 overflow-hidden h-[90vh] max-h-[90vh] flex flex-col">

          {/* ── Header ── */}
          <div className="px-6 pt-5 pb-0 border-b border-slate-800/80 shrink-0">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                  <FileAudio className="h-4 w-4 text-teal-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Retour RDV</p>
                  <p className="text-base font-semibold text-white truncate">{rdv.title}</p>
                </div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1">
              {TABS.map(({ id, label, icon: Icon }) => {
                const count = tabBadge[id];
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-150 cursor-pointer",
                      isActive
                        ? "text-white bg-slate-800/60"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{label}</span>
                    {count !== undefined && (
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                        isActive ? "bg-teal-500/20 text-teal-400" : "bg-slate-700 text-slate-500"
                      )}>
                        {count}
                      </span>
                    )}
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-teal-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Content ── */}
          <div className="overflow-y-auto flex-1 px-6 py-6 bg-slate-900/30">
            {activeTab === "summary" && (
              <SummaryTab summary={(meeting?.summary as MeetingSummary | null) ?? null} />
            )}
            {activeTab === "elements" && (
              <ElementsTab items={elemItems} />
            )}
            {activeTab === "tasks" && (
              <TasksTab items={todoItems} />
            )}
            {activeTab === "nextsteps" && (
              <NextStepsTab items={nextItems} />
            )}
          </div>

          {/* ── Footer ── */}
          {meeting?.transcription && (
            <div className="border-t border-slate-800/80 px-6 py-3.5 flex items-center justify-end shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowTranscription(true)}
                className="text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 transition-colors duration-150"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Afficher la transcription complète
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {meeting?.transcription && (
        <TranscriptionDialog
          open={showTranscription}
          onClose={() => setShowTranscription(false)}
          transcription={meeting.transcription}
          title={rdv.title}
        />
      )}
    </>
  );
}
