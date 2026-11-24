// @ts-nocheck
import { SHOW_ANALYSIS, SHOW_CLOSURE, isAuthorStageVisible } from "./config";
import { useState, useRef, useMemo, useEffect, useLayoutEffect, useCallback } from "react";
import {
  Zap, FolderOpen, ClipboardList, Search, GitBranch,
  Clock, AlertTriangle, Settings, CheckCircle2, Download,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Save, Bell, HelpCircle, Check, X, Plus,
  Sparkles, Info, Eye, RefreshCw, FileUp, FileText,
  BarChart3, Archive, AlertCircle, Link2,
  ThumbsUp, ThumbsDown, RotateCcw, Shield,
} from "lucide-react";
import {
  acceptFact,
  extractFacts,
  generateCapaLevelAssignment,
  generateCapaDraft,
  generateHistoricalReviewSearchCriteria,
  evaluateHistoricalReviewRecords,
  generateResolution,
  generateInvestigation,
  generateRca,
  loadCaseSummary,
  loadHistoricalReviewFilterOptions,
  refreshWorkspace as refreshWorkspaceApi,
  type RcaMethodId,
  rejectFact,
  setCaseIntake,
  saveCase,
  searchHistoricalReviews,
  updateHistoricalReview,
  updateCapaLevelReview,
  updateCapaLevelSummary,
  updateCapaDraft,
  updateResolutionPlan,
  uploadEvidence,
  type CAPALevelMismatch,
  type CAPALevelRecordReview,
  type CAPALevelReview,
  type CAPALevelReviewValidation,
  type HistoricalReview,
  type HistoricalReviewRecordEvaluation,
  type HistoricalSearchCriteriaDraft,
  type HistoricalReviewFilterOptions,
  type HistoricalReviewSelectedRecord,
  type HistoricalReviewSearchRecord,
  type CAPADraft,
  type ResolutionPlan,
  type ResolutionRecord,
  type ResolutionAlignment,
  type Correction,
  type CorrectiveAction,
  type PreventiveAction,
  type EffectivenessPlan,
  type WorkspaceCase,
  type WorkspaceEvidence,
  type WorkspaceFact,
  type WorkspaceFactStatus,
  type CaseSummaryView,
} from "./api/workspace";
import {
  reviewExport,
} from "./api/review";
import {
  listCaseDrafts,
  saveCaseDraft,
  updateDraft,
  type DraftEntry,
} from "./api/drafts";
import type { TrackWiseRecord } from "./api/trackwise";
import { buildInvestigationReport } from "./reporting/buildInvestigationReport";
import { createInvestigationReportDocument } from "./reporting/renderInvestigationReport";
import {
  filterHistoricalReviewCandidateRecords,
  resolveHistoricalReviewSummary,
} from "./historicalReviewSelection";
import { CaseSelect } from "./components/CaseSelect";
import { DEMO_CASE_ID } from "./api/mockBackend";
import { CaseSummaryPage } from "./components/CaseSummaryPage";
import { RiskAssessmentStage as RiskAssessmentStagePanel } from "./components/RiskAssessmentStage";
import { ReviewPanel } from "./components/ReviewPanel";

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
type StageStatus = "complete" | "active" | "pending";
type RapidStatus = "required" | "not_required" | "already_completed";

interface StageConfig {
  id: StageId;
  label: string;
  icon: React.ElementType;
  group: "Initiation" | "Analysis" | "Closure";
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Constants Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const WORKSPACE_LABEL = "Fact Workbench";
const WORKSPACE_CONTEXT = "Blank workspace";
const WORKSPACE_HINT = "Upload evidence to begin";

const STAGES: StageConfig[] = [
  { id: 1, label: "Initial Quality Review", icon: Zap, group: "Initiation" },
  { id: 2, label: "Evidence", icon: FolderOpen, group: "Initiation" },
  { id: 3, label: "Facts", icon: ClipboardList, group: "Initiation" },
  { id: 4, label: "Investigation", icon: Search, group: "Analysis" },
  { id: 5, label: "RCA", icon: GitBranch, group: "Analysis" },
  { id: 6, label: "Historical Review", icon: Clock, group: "Analysis" },
  { id: 7, label: "Risk", icon: Shield, group: "Analysis" },
  { id: 8, label: "Resolution Planning", icon: Settings, group: "Closure" },
  { id: 9, label: "CAPA Draft", icon: Archive, group: "Closure" },
  { id: 10, label: "CAPA Level", icon: ClipboardList, group: "Closure" },
  { id: 11, label: "Report Generation", icon: Download, group: "Closure" },
];

const STAGE_GROUPS: { label: string; ids: StageId[] }[] = [
  { label: "Initiation", ids: [1] },
  { label: "Analysis", ids: [4, 5, 6, 7] },
  { label: "Closure", ids: [8, 9, 10, 11] },
];

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Shared components Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function formatBytes(b: number) {
  return b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function workspaceHasUploadedEvidence(workspace: WorkspaceCase | null, expectedTitles: string[]) {
  const evidenceTitles = new Set(
    (workspace?.evidence || []).map((item) => String(item.evidence_title || item.note || "").trim().toLowerCase()),
  );

  return expectedTitles.every((title) => evidenceTitles.has(title.trim().toLowerCase()));
}

function workspaceHasFactStatus(workspace: WorkspaceCase | null, factId: string, status: FactStatus) {
  const allFacts = [
    ...(workspace?.facts?.proposed || []),
    ...(workspace?.facts?.accepted || []),
    ...(workspace?.facts?.rejected || []),
  ];

  return allFacts.some((fact) => String(fact.fact_id || "") === factId && fact.status === status);
}

function GenerateCTA({ label, onGenerate, disabled = false, note, testId }: {
  label: string; onGenerate: () => void | Promise<void>; disabled?: boolean; note?: string; testId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const fire = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await onGenerate();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center justify-between gap-4 pt-4 border-t border-[rgba(0,0,0,0.06)] mt-4">
      <p className="text-[11px] text-[#6b6b7a] flex items-center gap-1 min-h-[20px]">
        {note && <><Info size={10} />{note}</>}
      </p>
      <button onClick={fire} disabled={disabled || busy} data-testid={testId}
        className={`flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${disabled ? "bg-[#e8e8ec] text-[#b0b0bc] cursor-not-allowed"
          : "bg-[#c0172d] text-white hover:bg-[#a8142a] shadow-sm"}`}>
        {busy
          ? <><RefreshCw size={14} className="animate-spin" />Generating</>
          : <><Sparkles size={14} />{label}</>}
      </button>
    </div>
  );
}

type WorkspaceNotice =
  | { kind: "success" | "error" | "info"; message: string }
  | null;

function WorkspaceStatusBanner({ notice, loading }: { notice: WorkspaceNotice; loading: boolean }) {
  const message = loading
    ? "Loading synthetic demo workspace..."
    : notice?.message || "Demo workspace ready — changes are stored in memory only.";

  const styles = loading
    ? "border-blue-100 bg-blue-50 text-blue-700"
    : notice?.kind === "success"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : notice?.kind === "error"
        ? "border-rose-100 bg-rose-50 text-rose-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${styles}`} role="status" aria-live="polite" data-testid="workspace-status">
      {message}
    </div>
  );
}

function Accordion({ title, summary, badge, defaultOpen = true, children }: {
  title: string; summary?: string; badge?: React.ReactNode;
  defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#fafafa] transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#111118]">{title}</span>
            {badge}
          </div>
          {!open && summary && <p className="text-[11px] text-[#6b6b7a] mt-0.5 truncate">{summary}</p>}
        </div>
        {open
          ? <ChevronUp size={14} className="text-[#6b6b7a] shrink-0" />
          : <ChevronDown size={14} className="text-[#6b6b7a] shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 pt-2 border-t border-[rgba(0,0,0,0.05)]">{children}</div>}
    </div>
  );
}

function EditField({
  label,
  value,
  rows = 2,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange?: (value: string) => void;
}) {
  const [v, setV] = useState(value);

  useEffect(() => {
    setV(value);
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">{label}</label>
      <textarea value={v} onChange={(e) => { setV(e.target.value); onChange?.(e.target.value); }} rows={rows}
        className="px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] text-sm text-[#111118] resize-none focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d] leading-relaxed transition-colors" />
    </div>
  );
}

function AutoGrowEditField({
  label,
  value,
  rows = 2,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange?: (value: string) => void;
}) {
  const [v, setV] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setV(value);
  }, [value]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [v]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">{label}</label>
      <textarea
        ref={textareaRef}
        value={v}
        onChange={(e) => { setV(e.target.value); onChange?.(e.target.value); }}
        rows={rows}
        className="min-h-[44px] overflow-hidden px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] text-sm text-[#111118] resize-none focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d] leading-relaxed transition-colors"
      />
    </div>
  );
}

function useAutoResizeTextarea(value: string, minHeight: number) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
  }, [minHeight]);

  useLayoutEffect(() => {
    resizeTextarea();

    const frame = requestAnimationFrame(() => {
      resizeTextarea();
    });

    return () => cancelAnimationFrame(frame);
  }, [resizeTextarea, value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      resizeTextarea();
    });

    observer.observe(textarea);

    return () => {
      observer.disconnect();
    };
  }, [resizeTextarea]);

  return textareaRef;
}

function SequenceEventDescriptionField({
  value,
  onChange,
  testId,
  placeholder,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  testId: string;
  placeholder: string;
}) {
  const textareaRef = useAutoResizeTextarea(value, 96);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={4}
      style={{ minHeight: 96 }}
      className="overflow-hidden rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] px-3 py-2 text-sm leading-relaxed text-[#111118] resize-none focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
      placeholder={placeholder}
      data-testid={testId}
    />
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-[#111118] mt-0.5">{value}</p>
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Stage 1: RAPID Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function normalizeRapidStatus(value: unknown): RapidStatus {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "not_required" || normalized === "already_completed") {
    return normalized;
  }
  return "required";
}

function formatRapidStatus(status: RapidStatus) {
  if (status === "not_required") {
    return "Not Required";
  }
  if (status === "already_completed") {
    return "Already Completed";
  }
  return "Required";
}

function buildTrackwiseMetadata(record: TrackWiseRecord | null | undefined) {
  if (!record) {
    return {};
  }

  return {
    assigned_to: record.assigned_to,
    site: record.site,
    current_state: record.current_state,
    date_opened: record.date_opened,
    date_due: record.date_due,
    days_remaining: record.days_remaining,
    rapid_status: normalizeRapidStatus(record.rapid_status),
  };
}

function isHydratedStageCompleteStatus(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  return [
    "approved",
    "ready_for_review",
    "reviewed",
    "completed",
    "complete",
    "not_required",
    "already_completed",
  ].includes(normalized);
}

function inferStageFromWorkspace(workspace: WorkspaceCase | null): StageId {
  if (!workspace) {
    return 1;
  }

  const hasIntake = Boolean(
    workspace.case_intake?.detailed_description?.trim()
    && workspace.case_intake?.immediate_action_taken?.trim(),
  );
  if (!hasIntake) {
    return 1;
  }

  const hasEvidence = (workspace.evidence || []).length > 0;
  const hasFacts = Boolean(
    (workspace.facts?.proposed || []).length
    || (workspace.facts?.accepted || []).length
    || (workspace.facts?.rejected || []).length,
  );
  const hasInvestigation = Boolean(
    workspace.investigation
    || workspace.sequence_of_events
    || workspace.background_information
    || workspace.data_and_evidence_collection
    || workspace.error_classification
    || workspace.health_hazard_assessment
    || workspace.impact_assessment,
  );
  const hasRca = Boolean(workspace.rca && (
    isHydratedStageCompleteStatus((workspace.rca as { status?: string } | null)?.status)
    || isHydratedStageCompleteStatus((workspace.root_cause as { status?: string } | null)?.status)
    || String((workspace.root_cause as { statement?: string } | null)?.statement || "").trim()
    || String((workspace.rca as { root_cause?: string } | null)?.root_cause || "").trim()
    || String((workspace.rca as { reasoning?: string } | null)?.reasoning || "").trim()
  ));
  const historicalReviewStatus = String(workspace.historical_review?.status || "").trim().toLowerCase();
  const hasHistoricalReview = Boolean(workspace.historical_review && isHydratedStageCompleteStatus(historicalReviewStatus));
  const riskAssessmentStatus = String(workspace.risk_assessment?.status || "").trim().toLowerCase();
  const hasRiskAssessment = Boolean(
    workspace.risk_assessment && riskAssessmentStatus !== "not_started",
  );
  const resolutionPlanStatus = String(workspace.resolution_plan?.status || "").trim().toLowerCase();
  const hasResolutionPlan = Boolean(workspace.resolution_plan && isHydratedStageCompleteStatus(resolutionPlanStatus));
  const capaDraftStatus = String(workspace.capa_draft?.status || "").trim().toLowerCase();
  const hasCapaDraft = Boolean(workspace.capa_draft && isHydratedStageCompleteStatus(capaDraftStatus));
  const capaLevelStatus = String(workspace.capa_level_summary?.status || "").trim().toLowerCase();
  const hasCapaLevelSummary = Boolean(workspace.capa_level_summary && isHydratedStageCompleteStatus(capaLevelStatus));
  const capaLevelReviewStatus = String(workspace.capa_level_review?.status || "").trim().toLowerCase();
  const hasCapaLevelReview = Boolean(workspace.capa_level_review && isHydratedStageCompleteStatus(capaLevelReviewStatus));
  const hasReportGeneration = Boolean(workspace.conclusion);

  if (hasReportGeneration) return 11;
  if (hasCapaLevelReview || hasCapaLevelSummary) return 10;
  if (hasCapaDraft) return 9;
  if (hasResolutionPlan) return 8;
  if (hasRiskAssessment) return 7;
  if (hasHistoricalReview) return 6;
  if (hasRca) return 5;
  if (hasInvestigation) return 4;
  if (hasFacts) return 3;
  if (hasEvidence) return 2;
  return 2;
}

function isNonEmptyText(value: unknown) {
  return Boolean(String(value || "").trim());
}

function hasResolvedFacts(workspace: WorkspaceCase | null) {
  return Boolean((workspace?.facts?.accepted || []).length || (workspace?.facts?.rejected || []).length);
}

function buildCompletedStages(workspace: WorkspaceCase | null): Set<StageId> {
  const completed = new Set<StageId>();

  if (!workspace) {
    return completed;
  }

  const hasIntake = Boolean(
    isNonEmptyText(workspace.case_intake?.detailed_description)
    && isNonEmptyText(workspace.case_intake?.immediate_action_taken),
  );
  const hasEvidence = (workspace.evidence || []).length > 0;
  const hasInvestigation = Boolean(
    workspace.investigation
    || workspace.sequence_of_events
    || workspace.background_information
    || workspace.data_and_evidence_collection
    || workspace.error_classification
    || workspace.health_hazard_assessment
    || workspace.impact_assessment,
  );
  const hasRca = Boolean(
    isHydratedStageCompleteStatus((workspace as { root_cause?: { status?: string; statement?: string } } | null)?.root_cause?.status)
    || isHydratedStageCompleteStatus((workspace as { rca?: { status?: string } } | null)?.rca?.status)
    || isNonEmptyText((workspace as { root_cause?: { statement?: string } } | null)?.root_cause?.statement)
    || isNonEmptyText((workspace as { rca?: { root_cause?: string; reasoning?: string } } | null)?.rca?.root_cause)
    || isNonEmptyText((workspace as { rca?: { reasoning?: string } } | null)?.rca?.reasoning)
  );
  const historicalReviewStatus = String(workspace.historical_review?.status || "").trim().toLowerCase();
  const hasHistoricalReview = Boolean(
    workspace.historical_review && isHydratedStageCompleteStatus(historicalReviewStatus),
  );
  const riskAssessmentStatus = String(workspace.risk_assessment?.status || "").trim().toLowerCase();
  const hasRiskAssessment = Boolean(
    workspace.risk_assessment && isHydratedStageCompleteStatus(riskAssessmentStatus),
  );
  const resolutionPlanStatus = String(workspace.resolution_plan?.status || "").trim().toLowerCase();
  const hasResolutionPlan = Boolean(
    workspace.resolution_plan && isHydratedStageCompleteStatus(resolutionPlanStatus),
  );
  const capaDraftStatus = String(workspace.capa_draft?.status || "").trim().toLowerCase();
  const hasCapaDraft = Boolean(
    workspace.capa_draft && isHydratedStageCompleteStatus(capaDraftStatus),
  );
  const capaLevelStatus = String(workspace.capa_level_summary?.status || "").trim().toLowerCase();
  const hasCapaLevelSummary = Boolean(
    workspace.capa_level_summary && isHydratedStageCompleteStatus(capaLevelStatus),
  );
  const hasReportGeneration = Boolean(workspace.conclusion);

  if (hasIntake) completed.add(1);
  if (hasEvidence) completed.add(2);
  if (hasResolvedFacts(workspace)) completed.add(3);
  if (hasInvestigation) completed.add(4);
  if (hasRca) completed.add(5);
  if (hasHistoricalReview) completed.add(6);
  if (hasRiskAssessment) completed.add(7);
  if (hasResolutionPlan) completed.add(8);
  if (hasCapaDraft) completed.add(9);
  if (hasCapaLevelSummary) completed.add(10);
  if (hasReportGeneration) completed.add(11);

  return completed;
}

function RapidStage({
  onComplete,
  workspace,
  caseId,
  refreshWorkspace,
  isBusy,
  setBusy,
  setNotice,
  selectedTrackwiseRecord,
}: WorkspaceStageProps) {
  const existingIntake = workspace?.case_intake || null;
  const storedRecord = existingIntake?.trackwise_record as Partial<TrackWiseRecord> | undefined;
  const metadata = existingIntake?.metadata || buildTrackwiseMetadata(selectedTrackwiseRecord);
  const prId = existingIntake?.pr_id || selectedTrackwiseRecord?.pr_id || storedRecord?.pr_id || caseId;
  const [detailedDescription, setDetailedDescription] = useState(
    existingIntake?.detailed_description
    || selectedTrackwiseRecord?.tw_v_detailed_description
    || selectedTrackwiseRecord?.detailed_description
    || selectedTrackwiseRecord?.short_description
    || String(
      storedRecord?.tw_v_detailed_description
      || storedRecord?.detailed_description
      || storedRecord?.short_description
      || "",
    ),
  );
  const [immediateActionTaken, setImmediateActionTaken] = useState(
    existingIntake?.immediate_action_taken
    || selectedTrackwiseRecord?.tw_v_immediate_action_taken
    || selectedTrackwiseRecord?.immediate_action_taken
    || String(storedRecord?.tw_v_immediate_action_taken || storedRecord?.immediate_action_taken || ""),
  );

  useEffect(() => {
    setDetailedDescription(
      existingIntake?.detailed_description
      || selectedTrackwiseRecord?.tw_v_detailed_description
      || selectedTrackwiseRecord?.detailed_description
      || selectedTrackwiseRecord?.short_description
      || String(
        storedRecord?.tw_v_detailed_description
        || storedRecord?.detailed_description
        || storedRecord?.short_description
        || "",
      ),
    );
    setImmediateActionTaken(
      existingIntake?.immediate_action_taken
      || selectedTrackwiseRecord?.tw_v_immediate_action_taken
      || selectedTrackwiseRecord?.immediate_action_taken
      || String(storedRecord?.tw_v_immediate_action_taken || storedRecord?.immediate_action_taken || ""),
    );
  }, [
    caseId,
    existingIntake?.detailed_description,
    existingIntake?.immediate_action_taken,
    selectedTrackwiseRecord?.tw_v_detailed_description,
    selectedTrackwiseRecord?.tw_v_immediate_action_taken,
    selectedTrackwiseRecord?.detailed_description,
    selectedTrackwiseRecord?.short_description,
    selectedTrackwiseRecord?.immediate_action_taken,
    storedRecord?.tw_v_detailed_description,
    storedRecord?.tw_v_immediate_action_taken,
    storedRecord?.detailed_description,
    storedRecord?.short_description,
    storedRecord?.immediate_action_taken,
  ]);

  const rapidStatus = normalizeRapidStatus(
    existingIntake?.rapid_status || selectedTrackwiseRecord?.rapid_status || storedRecord?.rapid_status,
  );
  const rapidStatusValue = selectedTrackwiseRecord || storedRecord || existingIntake?.rapid_status
    ? formatRapidStatus(rapidStatus)
    : "Not available";
  const canInitializePackage = Boolean(detailedDescription.trim() && immediateActionTaken.trim() && caseId);
  const provenance = selectedTrackwiseRecord || storedRecord;

  const confirmCaseIntake = async () => {
    if (!canInitializePackage || isBusy) {
      return;
    }

    setBusy(true);
    try {
      await setCaseIntake(caseId, {
        pr_id: prId,
        metadata,
        detailed_description: detailedDescription.trim(),
        immediate_action_taken: immediateActionTaken.trim(),
        rapid_status: rapidStatus,
        record: provenance,
      });

      const aiFailures: string[] = [];
      try {
        await extractFacts(caseId, { source_type: "case_intake" });
      } catch (error) {
        aiFailures.push(error instanceof Error ? error.message : "Intake fact generation failed.");
      }

      await refreshWorkspace();
      onComplete();

      if (aiFailures.length > 0) {
        setNotice({
          kind: "error",
          message: `Initial Quality Review saved, but intake fact generation failed: ${aiFailures.join(" ")}`,
        });
      } else {
        setNotice({
          kind: "success",
          message: "Initial Quality Review saved. Case intake evidence and intake facts are ready.",
        });
      }
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Initial Quality Review could not be saved." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Accordion
        title="Initial Quality Review"
        summary={prId ? `${prId} - Confirm the intake narrative and initialize the investigation package` : "Confirm the intake narrative and initialize the investigation package"}
        badge={<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">Stage 1</span>}
      >
        <div className="space-y-4 pt-1" data-testid="case-intake-section">
          <div className="grid gap-3 sm:grid-cols-3">
            <FieldRow label="PR ID" value={prId || "Draft"} />
            <FieldRow label="Source" value={selectedTrackwiseRecord ? "TrackWise Record" : workspace?.case_intake ? "Saved Intake" : "Draft Intake"} />
            <div data-testid="case-intake-rapid-required">
              <FieldRow label="RAPID Required" value={rapidStatusValue} />
            </div>
          </div>

          {provenance && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-3">
              <FieldRow label="Assigned To" value={String(provenance.assigned_to || "Not available")} />
              <FieldRow label="Site" value={String(provenance.site || "Not available")} />
              <FieldRow label="Status" value={String(provenance.current_state || "Not available")} />
              <FieldRow label="Opened" value={String(provenance.date_opened || "Not available")} />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="case-intake-detailed-description" className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">
              Detailed Description
            </label>
            <textarea
              id="case-intake-detailed-description"
              data-testid="case-intake-detailed-description"
              value={detailedDescription}
              onChange={(event) => setDetailedDescription(event.target.value)}
              rows={5}
              className="px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] text-sm text-[#111118] resize-none focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d] leading-relaxed transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="case-intake-immediate-action-taken" className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">
              Immediate Action Taken
            </label>
            <textarea
              id="case-intake-immediate-action-taken"
              data-testid="case-intake-immediate-action-taken"
              value={immediateActionTaken}
              onChange={(event) => setImmediateActionTaken(event.target.value)}
              rows={4}
              className="px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] text-sm text-[#111118] resize-none focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d] leading-relaxed transition-colors"
            />
          </div>

          <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
            <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Imported Metadata</p>
            <p className="mt-2 text-sm text-[#111118]">
              AUTHOR uses TrackWise intake details to initialize the investigation package. RAPID Required is shown for context only and is not editable here.
            </p>
            <p className="mt-2 text-xs text-[#6b6b7a]" data-testid="case-intake-provenance">
              Case Intake evidence and intake-backed facts will be created after confirmation.
            </p>
          </div>
        </div>
      </Accordion>

      <div className="flex items-center justify-between gap-4 pt-4 border-t border-[rgba(0,0,0,0.06)] mt-4">
        <p className="text-[11px] text-[#6b6b7a] flex items-center gap-1 min-h-[20px]">
          <Info size={10} />
          Initial Quality Review stays disabled until Detailed Description and Immediate Action Taken are confirmed.
        </p>
        <button
          onClick={() => void confirmCaseIntake()}
          disabled={!canInitializePackage || isBusy}
          data-testid="confirm-case-intake-button"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${!canInitializePackage || isBusy
            ? "bg-[#e8e8ec] text-[#b0b0bc] cursor-not-allowed"
            : "bg-[#c0172d] text-white hover:bg-[#a8142a] shadow-sm"
            }`}
        >
          {isBusy
            ? <><RefreshCw size={14} className="animate-spin" />Saving...</>
            : <><Sparkles size={14} />Confirm Initial Quality Review</>}
        </button>
      </div>
    </div>
  );
}
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Stage 2: Evidence Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

type EvidCat = "Case Intake" | "SOP Review" | "Batch Records" | "Interviews" | "Equipment" | "Historical" | "Protocol" | "Photos" | "Attachments";
const EVID_CATS: EvidCat[] = ["Case Intake", "SOP Review", "Batch Records", "Interviews", "Equipment", "Historical", "Protocol", "Photos", "Attachments"];

const EXT_CFG: Record<string, { bg: string; text: string; lbl: string }> = {
  pdf: { bg: "bg-red-50", text: "text-red-600", lbl: "PDF" },
  xlsx: { bg: "bg-emerald-50", text: "text-emerald-700", lbl: "XLS" },
  docx: { bg: "bg-blue-50", text: "text-blue-600", lbl: "DOC" },
  zip: { bg: "bg-amber-50", text: "text-amber-700", lbl: "ZIP" },
};

function FileIcon({ ext }: { ext: string }) {
  const c = EXT_CFG[ext] ?? { bg: "bg-[#f0f0f3]", text: "text-[#6b6b7a]", lbl: "FILE" };
  return (
    <div className={`w-8 h-8 rounded-lg ${c.bg} flex flex-col items-center justify-center shrink-0`}>
      <FileText size={11} className={c.text} />
      <span className={`text-[7px] font-bold leading-none mt-0.5 ${c.text}`}>{c.lbl}</span>
    </div>
  );
}

type EvidenceViewItem = {
  id: string;
  name: string;
  bytes: number;
  ext: string;
  cat: EvidCat;
  sourceType: string;
  sourceName: string;
  sourceField: string;
  sourceLocation: string;
  status: "ready" | "processing" | "error";
  note?: string;
  source_data: string;
};

type WorkspaceStageProps = {
  onComplete: () => void;
  workspace: WorkspaceCase | null;
  caseId: string;
  refreshWorkspace: (targetCaseId?: string | null) => Promise<WorkspaceCase | null>;
  isBusy: boolean;
  setBusy: (busy: boolean) => void;
  setNotice: (notice: WorkspaceNotice) => void;
  selectedTrackwiseRecord: TrackWiseRecord | null;
  registerStageDraftSave?: (handler: (() => Promise<void>) | null) => void;
};

function evidenceCategoryFromValue(value?: string): EvidCat {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.includes("case intake") || normalized.includes("case_intake")) return "Case Intake";
  if (normalized.includes("batch")) return "Batch Records";
  if (normalized.includes("interview")) return "Interviews";
  if (normalized.includes("equipment")) return "Equipment";
  if (normalized.includes("histor")) return "Historical";
  if (normalized.includes("protocol")) return "Protocol";
  if (normalized.includes("photo")) return "Photos";
  if (normalized.includes("attach")) return "Attachments";
  return "SOP Review";
}

function inferExt(name: string) {
  const match = /\.([a-z0-9]+)$/i.exec(name || "");
  return match ? match[1].toLowerCase() : "file";
}

function buildEvidenceView(workspace: WorkspaceCase | null): EvidenceViewItem[] {
  return (workspace?.evidence || []).map((item, index) => {
    const title = item.evidence_title || item.note || `Evidence ${index + 1}`;
    const sourceData = String(item.source_data || "");
    const category = evidenceCategoryFromValue(item.category || item.source_type);
    return {
      id: item.evidence_id || `E${index + 1}`,
      name: title,
      bytes: Number(item.bytes || 0),
      ext: inferExt(title),
      cat: category,
      sourceType: String(item.source_type || ""),
      sourceName: String(item.source_name || (String(item.source_type || "").toLowerCase() === "case_intake" ? "Case Intake" : "Uploaded File")),
      sourceField: String(item.source_field || ""),
      sourceLocation: String(item.source_location || ""),
      status: String(item.status || "ready").toLowerCase() === "processing" ? "processing" : "ready",
      note: item.note,
      source_data: sourceData,
    };
  });
}

function EvidenceStage({ onComplete, workspace, caseId, refreshWorkspace, isBusy, setBusy, setNotice }: WorkspaceStageProps) {
  const [cat, setCat] = useState<EvidCat>("SOP Review");
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);

  const evidence = useMemo(() => buildEvidenceView(workspace), [workspace]);
  const userChangedCategory = useRef(false);

  const handleCategoryChange = (next: EvidCat) => {
    userChangedCategory.current = true;
    setCat(next);
  };
  const items = useMemo(() => evidence.filter((e) => e.cat === cat), [evidence, cat]);
  const catCounts = useMemo(() => {
    const m: Partial<Record<EvidCat, number>> = {};
    evidence.forEach((e) => { m[e.cat] = (m[e.cat] ?? 0) + 1; });
    return m;
  }, [evidence]);
  const uploadedEvidence = useMemo(() => evidence.filter((item) => item.sourceType === "uploaded_evidence"), [evidence]);
  const uploadedReady = uploadedEvidence.filter((item) => item.status === "ready").length;
  const ready = evidence.filter((e) => e.status === "ready").length;
  const total = evidence.length;
  const uploadsEnabled = cat !== "Case Intake";

  useEffect(() => {
    if (userChangedCategory.current) {
      return;
    }

    if ((catCounts[cat] ?? 0) > 0) {
      return;
    }

    const firstAvailable = EVID_CATS.find(
      (category) => (catCounts[category] ?? 0) > 0
    );

    if (firstAvailable && firstAvailable !== cat) {
      setCat(firstAvailable);
    }
  }, [cat, catCounts]);

  const uploadSelectedFiles = async (files: FileList | File[]) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;

    setUploading(true);
    setBusy(true);
    try {
      const evidenceItems = await Promise.all(list.map(async (file) => ({
        evidence_title: file.name,
        source_data: await file.text(),
        category: cat,
        note: file.name,
        bytes: file.size,
        mime_type: file.type,
        status: file.size > 0 ? "ready" : "processing",
      })));
      await uploadEvidence(caseId, evidenceItems);

      const expectedTitles = list.map((file) => file.name);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const refreshedWorkspace = await refreshWorkspace(caseId);
        if (workspaceHasUploadedEvidence(refreshedWorkspace, expectedTitles)) {
          break;
        }
        if (attempt < 4) {
          await sleep(250);
        }
      }

      setNotice({ kind: "success", message: `Uploaded ${list.length} evidence item${list.length === 1 ? "" : "s"}.` });
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Evidence upload failed." });
    } finally {
      setUploading(false);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Evidence", val: total, color: "text-[#111118]" },
          { label: "Ready", val: ready, color: "text-emerald-600" },
          { label: "Processing", val: total - ready, color: "text-blue-600" },
        ].map(({ label, val, color }) => (
          <div key={label} className="px-4 py-3 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white">
            <span className={`text-xl font-bold ${color}`}>{val}</span>
            <p className="text-[10px] font-semibold text-[#111118] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {EVID_CATS.map((c) => {
          const count = catCounts[c] ?? 0;
          const isActive = c === cat;
          const categoryTestId = `evidence-category-${c.toLowerCase().replace(/\s+/g, "-")}`;
          return (
            <button key={c} onClick={() => handleCategoryChange(c)} data-testid={categoryTestId}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${isActive ? "bg-[#c0172d] text-white border-[#c0172d]"
                : "bg-white text-[#6b6b7a] border-[rgba(0,0,0,0.1)] hover:text-[#111118] hover:border-[rgba(0,0,0,0.18)]"}`}>
              {c}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-[#f0f0f3] text-[#6b6b7a]"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (uploadsEnabled) {
            void uploadSelectedFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => { if (uploadsEnabled) inputRef.current?.click(); }}
        data-testid="evidence-upload-dropzone"
        className={`${uploadsEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-70"} rounded-xl border-2 border-dashed py-6 flex items-center justify-center gap-4 transition-all ${drag ? "border-[#c0172d] bg-[#fde8eb]"
          : "border-[rgba(0,0,0,0.1)] bg-[#fafafa] hover:border-[#c0172d]/40 hover:bg-[#fde8eb]/10"}`}>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          disabled={!uploadsEnabled}
          onChange={(e) => { if (uploadsEnabled) void uploadSelectedFiles(e.target.files || []); }}
        />
        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${drag ? "border-[#c0172d] bg-[#c0172d]/10" : "border-[rgba(0,0,0,0.1)] bg-white"}`}>
          <FileUp size={16} className={drag ? "text-[#c0172d]" : "text-[#6b6b7a]"} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${drag ? "text-[#c0172d]" : "text-[#111118]"}`}>
            {uploading || isBusy ? "Uploading evidence..." : uploadsEnabled ? `Add ${cat} evidence` : "Case Intake evidence is read-only"}
          </p>
          <p className="text-xs text-[#6b6b7a]">
            {uploadsEnabled ? "PDF, XLSX, DOCX, JPG, ZIP" : "Switch to an uploaded evidence category to add files."}
          </p>
        </div>
        <button
          disabled={!uploadsEnabled}
          onClick={(e) => { e.stopPropagation(); if (uploadsEnabled) inputRef.current?.click(); }}
          className="px-3 py-1.5 rounded-lg bg-white border border-[rgba(0,0,0,0.12)] text-xs font-semibold text-[#111118] hover:bg-[#f4f4f6] transition-colors">
          Browse
        </button>
      </div>

      {items.length > 0 ? (
        <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden divide-y divide-[rgba(0,0,0,0.05)]">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#fafafa] group transition-colors" data-testid="evidence-row">
              <FileIcon ext={item.ext} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#111118] truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-mono text-[#6b6b7a]">{item.bytes > 0 ? formatBytes(item.bytes) : "0 KB"}</span>
                  <span className="text-[#d0d0d8]">Â·</span>
                  <span className="text-[11px] text-[#6b6b7a]">Source: {item.sourceName}</span>
                  {item.sourceField && <><span className="text-[#d0d0d8]">Â·</span><span className="text-[11px] text-[#6b6b7a]">{item.sourceField}</span></>}
                  {item.note && <><span className="text-[#d0d0d8]">Â·</span><span className="text-[11px] text-[#6b6b7a]">{item.note}</span></>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.status === "ready"
                  ? <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><Check size={10} strokeWidth={3} />Ready</span>
                  : <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full"><RefreshCw size={10} className="animate-spin" />Processing</span>}
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-[#f0f0f3]">
                  <Eye size={12} className="text-[#6b6b7a]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-10 rounded-xl border border-dashed border-[rgba(0,0,0,0.1)] bg-white text-center">
          <FolderOpen size={22} className="text-[#d0d0d8] mb-2" />
          <p className="text-sm font-medium text-[#6b6b7a]">No {cat} evidence yet</p>
          <p className="text-[11px] text-[#b0b0bc] mt-1">Upload files above to add to this category</p>
        </div>
      )}

      <GenerateCTA
        label="Extract Facts"
        testId="extract-facts-button"
        onGenerate={async () => {
          setBusy(true);
          try {
            await extractFacts(caseId, { source_type: "uploaded_evidence" });
            await refreshWorkspace();
            setNotice({ kind: "success", message: "Facts extracted from workspace evidence." });
            onComplete();
          } catch (error) {
            setNotice({ kind: "error", message: error instanceof Error ? error.message : "Fact extraction failed." });
          } finally {
            setBusy(false);
          }
        }}
        disabled={uploadedEvidence.length === 0 || uploading || isBusy}
        note={`${uploadedReady} uploaded evidence items ready for analysis.`}
      />
    </div>
  );
}

// Stage 3: Facts
// Stage 3: Facts

type FactStatus = WorkspaceFactStatus;
type FactCat = "Event" | "Impact" | "Detection" | "Process" | "Material" | "Personnel";
type FactTab = "all" | "pending" | "accepted" | "rejected";

interface Fact {
  id: string;
  cat: FactCat;
  text: string;
  conf: number;
  srcType: string;
  src: string;
  loc: string;
  status: FactStatus;
  evidenceId?: string;
}

const CAT_STYLE: Record<FactCat, { pill: string; border: string }> = {
  Event: { pill: "bg-blue-50 text-blue-700 border-blue-100", border: "border-l-blue-400" },
  Impact: { pill: "bg-orange-50 text-orange-700 border-orange-100", border: "border-l-orange-400" },
  Detection: { pill: "bg-purple-50 text-purple-700 border-purple-100", border: "border-l-purple-400" },
  Process: { pill: "bg-emerald-50 text-emerald-700 border-emerald-100", border: "border-l-emerald-500" },
  Material: { pill: "bg-amber-50 text-amber-700 border-amber-100", border: "border-l-amber-400" },
  Personnel: { pill: "bg-rose-50 text-rose-700 border-rose-100", border: "border-l-rose-400" },
};

function normalizeFactCategory(category?: string): FactCat {
  const normalized = String(category || "").trim().toLowerCase();
  if (normalized.includes("impact")) return "Impact";
  if (normalized.includes("detect")) return "Detection";
  if (normalized.includes("process") || normalized.includes("observation")) return "Process";
  if (normalized.includes("material") || normalized.includes("measurement")) return "Material";
  if (normalized.includes("person")) return "Personnel";
  return "Event";
}

function buildFactsView(workspace: WorkspaceCase | null): Fact[] {
  const byId = new Map<string, Fact>();
  const addFacts = (facts: WorkspaceFact[] | undefined, status: FactStatus) => {
    for (const fact of facts || []) {
      const id = String(fact.fact_id || "").trim();
      const statement = String(fact.statement || "").trim();
      if (!id || !statement) continue;
      byId.set(id, {
        id,
        cat: normalizeFactCategory(fact.category),
        text: statement,
        conf: Math.round((Number(fact.confidence ?? 0.7) || 0.7) * 100),
        srcType: String(fact.source_type || "workspace"),
        src: fact.source_name || fact.evidence_title || fact.source_reference || fact.source_type || "Workspace",
        loc: fact.source_field || fact.source_location || fact.evidence_id || fact.source_reference || "",
        status,
        evidenceId: fact.evidence_id || undefined,
      });
    }
  };

  addFacts(workspace?.facts?.accepted, "accepted");
  addFacts(workspace?.facts?.rejected, "rejected");
  addFacts(workspace?.facts?.proposed, "pending");
  return Array.from(byId.values());
}

function FactsStage({ onComplete, workspace, caseId, refreshWorkspace, isBusy, setBusy, setNotice }: WorkspaceStageProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FactTab>("all");
  const [selectedFactIds, setSelectedFactIds] = useState<string[]>([]);

  const facts = useMemo(() => buildFactsView(workspace), [workspace]);
  const counts = useMemo(() => ({
    all: facts.length,
    pending: facts.filter((f) => f.status === "pending").length,
    accepted: facts.filter((f) => f.status === "accepted").length,
    rejected: facts.filter((f) => f.status === "rejected").length,
  }), [facts]);

  const visible = useMemo(() => {
    let list = tab === "all" ? facts : facts.filter((f) => f.status === tab);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((f) => f.text.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q));
    }
    return list;
  }, [facts, tab, query]);

  const toggleSelectedFacts = (factIds: string[], checked: boolean) => {
    setSelectedFactIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...factIds]));
      }
      const removal = new Set(factIds);
      return current.filter((factId) => !removal.has(factId));
    });
  };

  const visibleSelectableFacts = visible.filter((fact) => fact.status === "pending");
  const selectedVisibleFactIds = visibleSelectableFacts
    .map((fact) => fact.id)
    .filter((factId) => selectedFactIds.includes(factId));
  const allVisibleSelected = visibleSelectableFacts.length > 0 && selectedVisibleFactIds.length === visibleSelectableFacts.length;
  const someVisibleSelected = selectedVisibleFactIds.length > 0;
  const allDone = counts.pending === 0;
  const pct = facts.length === 0 ? 0 : Math.round(((counts.accepted + counts.rejected) / facts.length) * 100);

  const handleFactAction = async (factId: string, action: "accept" | "reject") => {
    setBusy(true);
    try {
      if (action === "accept") {
        await acceptFact(caseId, factId);
      } else {
        await rejectFact(caseId, factId);
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const refreshedWorkspace = await refreshWorkspace(caseId);
        if (workspaceHasFactStatus(refreshedWorkspace, factId, action === "accept" ? "accepted" : "rejected")) {
          break;
        }
        if (attempt < 4) {
          await sleep(250);
        }
      }

      setSelectedFactIds((current) => current.filter((selectedId) => selectedId !== factId));
      setNotice({ kind: "success", message: action === "accept" ? "Fact accepted." : "Fact rejected." });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Fact review failed." });
    } finally {
      setBusy(false);
    }
  };

  const handleBulkFactAction = async (action: "accept" | "reject") => {
    const targetFactIds = selectedFactIds.filter((factId) => visibleSelectableFacts.some((fact) => fact.id === factId));
    if (targetFactIds.length === 0) {
      return;
    }

    setBusy(true);
    try {
      for (const factId of targetFactIds) {
        if (action === "accept") {
          await acceptFact(caseId, factId);
        } else {
          await rejectFact(caseId, factId);
        }
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const refreshedWorkspace = await refreshWorkspace(caseId);
        const allUpdated = targetFactIds.every((factId) => workspaceHasFactStatus(refreshedWorkspace, factId, action === "accept" ? "accepted" : "rejected"));
        if (allUpdated) {
          break;
        }
        if (attempt < 4) {
          await sleep(250);
        }
      }

      setSelectedFactIds((current) => current.filter((factId) => !targetFactIds.includes(factId)));
      setNotice({
        kind: "success",
        message: action === "accept"
          ? `${targetFactIds.length} fact${targetFactIds.length === 1 ? "" : "s"} accepted.`
          : `${targetFactIds.length} fact${targetFactIds.length === 1 ? "" : "s"} rejected.`,
      });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Bulk fact review failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2.5">
        {[
          { lbl: "Total", val: counts.all, color: "text-[#111118]", bg: "" },
          { lbl: "Accepted", val: counts.accepted, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { lbl: "Rejected", val: counts.rejected, color: "text-[#c0172d]", bg: "bg-[#fde8eb] border-[#c0172d]/15" },
          { lbl: "Pending", val: counts.pending, color: counts.pending > 0 ? "text-amber-600" : "text-[#6b6b7a]", bg: counts.pending > 0 ? "bg-amber-50 border-amber-100" : "" },
        ].map(({ lbl, val, color, bg }) => (
          <div key={lbl} className={`px-3 py-2.5 rounded-xl border bg-white ${bg || "border-[rgba(0,0,0,0.08)]"}`}>
            <span className={`text-lg font-bold leading-none ${color}`}>{val}</span>
            <p className="text-[10px] font-semibold text-[#111118] mt-0.5">{lbl}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-[#e8e8ec] overflow-hidden flex">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${facts.length ? (counts.accepted / facts.length) * 100 : 0}%` }} />
          <div className="h-full bg-[#c0172d] transition-all duration-500" style={{ width: `${facts.length ? (counts.rejected / facts.length) * 100 : 0}%` }} />
        </div>
        <span className="text-[11px] font-mono text-[#6b6b7a] shrink-0">{pct}% reviewed</span>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b6b7a]" />
          <input
            type="text"
            placeholder="Search facts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white text-sm placeholder:text-[#b0b0bc] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
          />
        </div>
        <div className="flex items-center bg-[#f0f0f3] rounded-lg p-0.5 shrink-0">
          {(["all", "pending", "accepted", "rejected"] as FactTab[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${tab === k ? "bg-white text-[#111118] shadow-sm" : "text-[#6b6b7a]"}`}
            >
              {k}
              <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-[#e8e8ec] text-[#6b6b7a]">{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
        <label className={`flex items-center gap-2 text-sm ${visibleSelectableFacts.length === 0 ? "text-[#b0b0bc]" : "text-[#111118]"}`}>
          <input
            type="checkbox"
            data-testid="facts-select-all-checkbox"
            checked={allVisibleSelected}
            onChange={(event) => { toggleSelectedFacts(visibleSelectableFacts.map((fact) => fact.id), event.target.checked); }}
            disabled={isBusy || visibleSelectableFacts.length === 0}
            aria-label="Select all visible facts"
            className="h-4 w-4 rounded border-[rgba(0,0,0,0.2)] text-[#c0172d] focus:ring-[#c0172d]"
          />
          <span>Select visible pending facts</span>
          {someVisibleSelected && <span className="text-[11px] text-[#6b6b7a]">({selectedVisibleFactIds.length} selected)</span>}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="bulk-accept-facts-button"
            disabled={isBusy || selectedVisibleFactIds.length === 0}
            onClick={() => { void handleBulkFactAction("accept"); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <ThumbsUp size={11} />Bulk Accept
          </button>
          <button
            type="button"
            data-testid="bulk-reject-facts-button"
            disabled={isBusy || selectedVisibleFactIds.length === 0}
            onClick={() => { void handleBulkFactAction("reject"); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[rgba(0,0,0,0.12)] text-[#c0172d] text-xs font-semibold hover:bg-[#fde8eb] transition-colors disabled:opacity-50"
          >
            <ThumbsDown size={11} />Bulk Reject
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {visible.length === 0 && (
          <div className="flex flex-col items-center py-10 text-center">
            <Search size={18} className="text-[#d0d0d8] mb-2" />
            <p className="text-sm text-[#6b6b7a]">No facts match</p>
          </div>
        )}
        {visible.map((fact) => {
          const cs = CAT_STYLE[fact.cat];
          const isPending = fact.status === "pending";
          const isAccepted = fact.status === "accepted";
          const isRejected = fact.status === "rejected";
          const isSelected = selectedFactIds.includes(fact.id);
          return (
            <div key={fact.id} className={`rounded-xl border border-l-4 bg-white overflow-hidden transition-all ${isRejected ? "border-[rgba(0,0,0,0.07)] border-l-[#c0172d] opacity-60" : `border-[rgba(0,0,0,0.09)] ${cs.border}`}`} data-testid="fact-card" data-fact-status={fact.status} data-fact-id={fact.id}>
              <div className={`px-4 pt-3.5 pb-2.5 ${isSelected ? "bg-[#fff7f8]" : ""}`}>
                <div className="flex items-start gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) => { toggleSelectedFacts([fact.id], event.target.checked); }}
                    disabled={isBusy || !isPending}
                    aria-label={`Select fact ${fact.text}`}
                    data-testid={`fact-select-checkbox-${fact.id}`}
                    className="mt-0.5 h-4 w-4 rounded border-[rgba(0,0,0,0.2)] text-[#c0172d] focus:ring-[#c0172d] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cs.pill}`}>{fact.cat}</span>
                      <span className="flex items-center gap-1 text-[11px] text-[#6b6b7a]">
                        <Sparkles size={10} className="text-[#c0172d]" />
                        <span className={`font-mono font-bold ${fact.conf >= 90 ? "text-emerald-600" : fact.conf >= 75 ? "text-amber-600" : "text-[#c0172d]"}`}>{fact.conf}%</span>
                      </span>
                      <div className="flex-1" />
                      {isAccepted && <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><Check size={10} strokeWidth={3} />Accepted</span>}
                      {isRejected && <span className="flex items-center gap-1 text-[11px] font-semibold text-[#c0172d] bg-[#fde8eb] border border-[#c0172d]/20 px-2 py-0.5 rounded-full"><X size={10} />Rejected</span>}
                    </div>
                    <p data-testid="fact-statement" className={`text-sm leading-relaxed ${isRejected ? "text-[#9a9aaa] line-through decoration-[#c0172d]/30" : "text-[#111118]"}`}>{fact.text}</p>
                    <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#f0f0f3] border border-[rgba(0,0,0,0.07)] w-fit max-w-full">
                      <Link2 size={10} className="text-[#6b6b7a] shrink-0" />
                      <span className="text-[11px] text-[#6b6b7a] font-medium truncate">{fact.srcType}</span>
                      <span className="text-[#d0d0d8]">?</span>
                      <span className="text-[11px] text-[#6b6b7a] font-medium truncate">{fact.src}</span>
                      {fact.loc && <><span className="text-[#d0d0d8]">?</span><span className="text-[11px] font-mono text-[#6b6b7a] shrink-0">{fact.loc}</span></>}
                    </div>
                  </div>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 border-t ${isPending ? "border-[rgba(0,0,0,0.06)] bg-[#fafafa]" : "border-[rgba(0,0,0,0.04)]"}`}>
                {isPending ? (
                  <>
                    <button disabled={isBusy} onClick={() => { void handleFactAction(fact.id, "accept"); }} data-testid="accept-fact-button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"><ThumbsUp size={11} />Accept</button>
                    <button disabled={isBusy} onClick={() => { void handleFactAction(fact.id, "reject"); }} data-testid="reject-fact-button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[rgba(0,0,0,0.12)] text-[#c0172d] text-xs font-semibold hover:bg-[#fde8eb] transition-colors disabled:opacity-50"><ThumbsDown size={11} />Reject</button>
                    <div className="flex-1" />
                    <button className="flex items-center gap-1 text-xs text-[#6b6b7a] hover:text-[#111118]"><Eye size={11} />View source</button>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] text-[#6b6b7a]">{isAccepted ? "Included in investigation draft." : "Excluded from draft."}</span>
                    <button disabled className="ml-auto flex items-center gap-1 text-xs text-[#6b6b7a] opacity-50"><RotateCcw size={10} />Undo</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button className="flex items-center gap-1.5 text-xs text-[#6b6b7a] hover:text-[#c0172d] transition-colors px-1"><Plus size={12} />Add fact manually</button>
      {SHOW_ANALYSIS && <GenerateCTA
        label="Generate Investigation"
        onGenerate={async () => {
          try {
            await generateInvestigation(caseId);
            const refreshedWorkspace = await refreshWorkspace(caseId);
            if (!refreshedWorkspace) {
              return;
            }

            if (!refreshedWorkspace.investigation) {
              setNotice({
                kind: "error",
                message: "Investigation generation completed without a draft to display.",
              });
              return;
            }

            onComplete();
            setNotice({
              kind: "success",
              message: "Investigation draft generated and ready for review.",
            });
          } catch (error) {
            setNotice({
              kind: "error",
              message: error instanceof Error ? error.message : "Investigation generation failed.",
            });
          }
        }}
        disabled={!allDone}
        note={allDone ? `${counts.accepted} facts accepted ? the investigation report can be drafted.` : `${counts.pending} facts still need a decision.`}
      />}
    </div>
  );
}

type InvSec = "sequence" | "background" | "findings" | "classification" | "hazard" | "impact";
type FindTab = "SOP Review" | "Record Review" | "Interviews" | "Equipment" | "Environmental";
type SequenceEventReviewStatus =
  | "keep"
  | "candidate_drop"
  | "candidate_review"
  | "invalid_unrenderable";
type SequenceEventDraft = {
  date_time: string;
  event: string;
  supporting_fact_ids: string;
  supporting_evidence_references: string;
  confidence: string;
  review_status?: SequenceEventReviewStatus;
  review_reason?: string;
};

type BackgroundInformationDraft = {
  process_description: string;
  equipment_involved: string;
  utility_involved: string;
  manufacturing_context: string;
  reviewed_fact_ids: string;
};

type FindingsNarrativeDraft = {
  detailed_description: string;
  immediate_actions: string;
  investigation_narrative: string;
};

type ErrorClassificationDraft = {
  draft_classification: string;
  human_review_required: boolean;
  error_classification_level_i: string;
  error_classification_level_ii: string;
  error_classification_level_iii: string;
  other_classification: string;
  reviewed_fact_ids: string;
};

type ErrorClassificationDebugInfo = {
  raw_llm_response: string;
  llm_validation_error: string;
  llm_response_status: string;
};

type HealthHazardAssessmentDraft = {
  assessment_required: string;
  justification: string;
  reviewed_fact_ids: string;
};

type ImpactAssessmentDraft = {
  impact_summary: string;
  product_quality_impact: string;
  patient_safety_impact: string;
  operational_impact: string;
  reviewed_fact_ids: string;
};

const INV_SECS: { id: InvSec; label: string }[] = [
  { id: "sequence", label: "Sequence of Events" },
  { id: "background", label: "Background" },
  { id: "findings", label: "Investigation Findings" },
  { id: "classification", label: "Error Classification" },
  { id: "hazard", label: "Health Hazard" },
  { id: "impact", label: "Impact Assessment" },
];
const FIND_TABS: FindTab[] = ["SOP Review", "Record Review", "Interviews", "Equipment", "Environmental"];

const INV_TEXT: Partial<Record<InvSec, string>> = {
  sequence: `14 May 2026, 08:00 Ã¢â‚¬â€ Day shift commences on Line 3. Packaging campaign for BN3238646 begins following morning line clearance by Shift Supervisor T. Lang.

14 May 2026, 09:30 Ã¢â‚¬â€ Secondary packaging operations begin. Shipper labels for BN3238646 retrieved from the shared staging area. Labels for concurrent lot BN3238631 stored adjacently without physical barriers.

14 May 2026, 10:45 Ã¢â‚¬â€ Label application begins. Operator R. Schulz applies labels without completing the required dual-operator reconciliation per SOP-PKG-0047 Rev. 3, Ã‚Â§4.3. Operator K. MÃƒÂ¼ller is not present for co-sign-off.

14 May 2026, 14:32 Ã¢â‚¬â€ QA Associate M. Hoffmann conducts shift-change line clearance and identifies the label discrepancy. Line 3 halted immediately. QA Manager J. Baus notified at 14:45.

14 May 2026, 15:00 Ã¢â‚¬â€ Site Quality Director and Regulatory Affairs informed. Full quarantine of ~1,200 units initiated per QP-GEN-0012.`,

  background: `Viberzi (cilansetron hydrochloride) Capsules, CIV, 75 mg is a Schedule IV controlled substance indicated for IBS-D in adults. Subject to enhanced regulatory oversight.

Lot BN3238646 was manufactured April 2026 and entered secondary packaging in May 2026. Batch size: 50,000 units. Expiry: March 2028.

Site 3 Ã¢â‚¬â€ Building 7 is the primary secondary packaging facility. Line 3 (PKG-LINE-003) is configured for blister pack labeling and shipper assembly and operates under ICH Q10 principles.

SOP-PKG-0047 Rev. 3 (effective 12 Jan 2025) governs label application. Section 4.3 requires a dual-operator reconciliation check and sign-off prior to label application for any lot.`,

  classification: `Error Type: Procedural Ã¢â‚¬â€ Process Step Omission

Classified as a procedural error from omission of the mandatory dual-operator label reconciliation. The procedure (SOP-PKG-0047 Rev. 3, Ã‚Â§4.3) was in place, accessible, and understood by trained personnel.

Classification:
Ã¢â‚¬Â¢ Category: Label / Packaging Error
Ã¢â‚¬Â¢ Severity: Major (potential patient confusion if released; no product defect)
Ã¢â‚¬Â¢ Detectability: High (detected within same shift by QA line clearance)
Ã¢â‚¬Â¢ Pattern: Evidence suggests systemic gap in label storage controls and verification compliance.

This event does NOT meet OOS criteria Ã¢â‚¬â€ the defect is labeling, not formulation-related.`,

  hazard: `Health Hazard Assessment: Low Risk

The mislabeling involved incorrect placement of shipper labels on correct product cartons. Product formulation and primary packaging (blister cards) remain intact and correctly labeled.

Basis for low risk:
Ã¢â‚¬Â¢ No risk of incorrect medication administration at the patient level.
Ã¢â‚¬Â¢ All affected units remain within site under quarantine Ã¢â‚¬â€ zero patient exposure.
Ã¢â‚¬Â¢ Discrepancy would be detectable at distributor or pharmacy level upon receipt.

No patient safety reporting obligation identified at this time. Assessment will be updated following root cause confirmation.`,

  impact: `Affected Lot: BN3238646 Ã¢â‚¬â€ Viberzi CIV 75mg Tabs
Batch Size: 50,000 units
Affected Units: ~1,200 (quarantined)
Released to Distribution: 0 units

Regulatory Impact: No reporting obligation identified. Classified as Major (DevClass-0002). Investigation target: 10 business days per DEV-PROC-001.

Downstream: Shipment of BN3238646 on hold pending resolution. Estimated 2Ã¢â‚¬â€œ3 week delay to market availability. No stock-out risk identified based on current inventory levels.`,
};

const FIND_TEXT: Record<FindTab, string> = {
  "SOP Review": `SOP-PKG-0047 Rev. 3 reviewed in full.

Section 4.3 requires dual-operator label reconciliation signed by two trained operators prior to commencing label application. Batch record for BN3238646 shows a single operator signature (R. Schulz); co-signer field is blank.

Procedure language: The Section 4 preamble uses "where practicable," which may be interpreted as allowing discretion for the dual-operator requirement. Revision of this language is recommended to eliminate ambiguity.

SOP-QA-0031 Rev. 2 (Line Clearance) was followed correctly by M. Hoffmann. Detection is attributable to this procedure functioning as designed.`,

  "Record Review": `Batch Record BN3238646:
Ã¢â‚¬Â¢ Section 7 (Label Application): Single operator signature. Co-signer field blank. Time: 14 May 2026, 10:45.
Ã¢â‚¬Â¢ Section 6 (Materials Issuance): Labels for BN3238646 and BN3238631 issued together on 13 May 2026 and staged in Line 3 packaging room.
Ã¢â‚¬Â¢ Section 8 (In-Process Checks): No in-process label check recorded between 10:45 and 14:32.

Line 3 Packaging Log:
Ã¢â‚¬Â¢ Entry at 10:43 confirms both lots staged adjacent at the labeling workstation.
Ã¢â‚¬Â¢ No lot changeover entry recorded between labeling of the two lots.
Ã¢â‚¬Â¢ Supervisor sign-off for shift handover (13:00) does not reference label reconciliation status.`,

  "Interviews": `M. Hoffmann, QA Associate (16 May 2026):
Confirmed mislabeling discovered during routine shift-change line clearance per SOP-QA-0031. Noted labels for two concurrent lots were visible on the packaging table and reconciliation records were incomplete. Has observed similar label storage practices on prior occasions without raising a formal concern.

R. Schulz, Packaging Operator (16 May 2026):
Confirmed he did not complete the dual-operator reconciliation. States K. MÃƒÂ¼ller was unavailable and time pressure from the shift schedule led him to proceed without a co-signer. Was aware of the SOP requirement. No deliberate deviation intended.

T. Lang, Shift Supervisor (17 May 2026):
Production targets for 14 May were higher than typical due to a backlog. Was not present at the labeling station and was not informed that the dual-operator check had not been completed.`,

  "Equipment": `Line 3 Label Applicator (PKG-LINE-003) Inspection Ã¢â‚¬â€ 15 May 2026:

Equipment inspected by Maintenance Engineer P. KÃƒÂ¶hler. No mechanical defects, label feed errors, or calibration deviations identified. Equipment is operating within specification.

No automated label verification system (vision inspection or scan verification) is installed on Line 3. Label verification is performed manually per SOP-PKG-0047 Ã‚Â§4.3.

Recommendation: Installation of an automated scan-verify system on Line 3 should be evaluated as part of the CAPA plan.`,

  "Environmental": `Environmental conditions during the event reviewed using Line 3 monitoring logs.

Temperature: 20.4Ã‚Â°C (within range 18Ã¢â‚¬â€œ24Ã‚Â°C)
Relative Humidity: 42% (within range 35Ã¢â‚¬â€œ65%)
Particulate counts: Within limits for the packaging area classification.

No environmental factors contributed to the deviation. The shared label staging area was adequately lit and met all facility standards. Environmental conditions are ruled out as contributing factors.`,
};

const DRAFT_EDITOR_USER = "user 1";

function buildInvestigationSectionKey(sec: InvSec, findTab: FindTab) {
  return sec === "findings" ? `findings:${findTab}` : sec;
}

function buildInvestigationSectionLabel(sec: InvSec, findTab: FindTab) {
  if (sec === "findings") {
    return `Findings Â· ${findTab}`;
  }
  return INV_SECS.find((section) => section.id === sec)?.label || "Investigation";
}

function buildInvestigationSectionTitle(sec: InvSec, findTab: FindTab) {
  if (sec === "findings") {
    return `Findings - ${findTab}`;
  }
  return INV_SECS.find((section) => section.id === sec)?.label || "Investigation";
}

function parseInvestigationSectionKey(sectionKey: string): { sec: InvSec; findTab: FindTab } {
  if (sectionKey.startsWith("findings:")) {
    const maybeTab = sectionKey.slice("findings:".length) as FindTab;
    if (FIND_TABS.includes(maybeTab)) {
      return { sec: "findings", findTab: maybeTab };
    }
    return { sec: "findings", findTab: "SOP Review" };
  }

  const section = INV_SECS.find((item) => item.id === sectionKey);
  return {
    sec: section?.id || "sequence",
    findTab: "SOP Review",
  };
}

function getDefaultInvestigationContent(sec: InvSec, findTab: FindTab) {
  return sec === "findings" ? FIND_TEXT[findTab] : "";
}

function getInitialFindingsNarrativeSource(workspace: WorkspaceCase | null, findTab: FindTab) {
  return getInvestigationContentFromWorkspace(workspace, "findings", findTab)
    || getDefaultInvestigationContent("findings", findTab)
    || "";
}

function getInvestigationContentFromWorkspace(workspace: WorkspaceCase | null, sec: InvSec, findTab: FindTab) {
  const value =
    sec === "sequence" ? workspace?.sequence_of_events
      : sec === "background" ? workspace?.background_information
        : sec === "classification" ? workspace?.error_classification
          : sec === "hazard" ? workspace?.health_hazard_assessment
            : sec === "impact" ? workspace?.impact_assessment
              : workspace?.investigation;

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? JSON.stringify(value, null, 2) : "";
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0
      ? JSON.stringify(value, null, 2)
      : "";
  }

  return "";
}

function normalizeSequenceEventReviewStatus(value: unknown): SequenceEventReviewStatus | undefined {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "keep"
    || normalized === "candidate_drop"
    || normalized === "candidate_review"
    || normalized === "invalid_unrenderable"
  ) {
    return normalized;
  }
  return undefined;
}

function normalizeSequenceEventDraft(value: unknown): SequenceEventDraft {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return {
      date_time: "",
      event: "",
      supporting_fact_ids: "",
      supporting_evidence_references: "",
      confidence: "",
    };
  }

  const record = value as Record<string, unknown>;
  const event = String(record.event || "").trim();
  const dateTime = String(record.date_time || "").trim();
  const supportingFactIds = asTextArray(record.supporting_fact_ids).join(", ");
  const supportingEvidenceReferences = asTextArray(record.supporting_evidence_references).join(", ");
  const confidenceRaw = record.confidence;
  const confidence = Number.isFinite(Number(confidenceRaw)) ? String(Number(confidenceRaw)) : "";
  const reviewStatus = normalizeSequenceEventReviewStatus(record.review_status);
  const reviewReason = String(record.review_reason || "").trim();

  return {
    date_time: dateTime,
    event,
    supporting_fact_ids: supportingFactIds,
    supporting_evidence_references: supportingEvidenceReferences,
    confidence,
    ...(reviewStatus ? { review_status: reviewStatus } : {}),
    ...(reviewReason ? { review_reason: reviewReason } : {}),
  };
}

function parseSequenceEventsContent(value: unknown): SequenceEventDraft[] {
  const toSanitizedRows = (rows: unknown[]) => rows.map((item) => normalizeSequenceEventDraft(item));

  if (Array.isArray(value)) {
    return toSanitizedRows(value);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.sequence_of_events)) {
      return toSanitizedRows(record.sequence_of_events);
    }
    return [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      return parseSequenceEventsContent(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  return [];
}

function serializeSequenceEventsContent(value: SequenceEventDraft[]) {
  const cleaned = value
    .map((item) => ({
      date_time: String(item.date_time || "").trim(),
      event: String(item.event || "").trim(),
      supporting_fact_ids: asTextArray(String(item.supporting_fact_ids || "").split(",")),
      supporting_evidence_references: asTextArray(String(item.supporting_evidence_references || "").split(",")),
      confidence: Number.isFinite(Number(item.confidence))
        ? Math.max(0, Math.min(1, Number(item.confidence)))
        : 0,
      review_status: normalizeSequenceEventReviewStatus(item.review_status),
      review_reason: String(item.review_reason || "").trim(),
    }));

  return JSON.stringify(
    {
      sequence_of_events: cleaned.map((item) => ({
        date_time: item.date_time,
        event: item.event,
        supporting_fact_ids: item.supporting_fact_ids,
        supporting_evidence_references: item.supporting_evidence_references,
        confidence: item.confidence,
        ...(item.review_status && item.review_status !== "keep" ? { review_status: item.review_status } : {}),
        ...(item.review_reason ? { review_reason: item.review_reason } : {}),
      })),
      notes: "",
      validation: {
        rows_generated: cleaned.length,
        rows_dropped: 0,
        has_date_gaps: cleaned.some((item) => !item.date_time || item.date_time.toLowerCase() === "unknown"),
        has_traceability: cleaned.every((item) => item.supporting_fact_ids.length > 0),
      },
    },
    null,
    2,
  );
}

function SequenceEventsEditor({
  value,
  onChange,
}: {
  value: SequenceEventDraft[];
  onChange: (next: SequenceEventDraft[]) => void;
}) {
  const updateRow = <K extends keyof SequenceEventDraft>(index: number, field: K, nextValue: SequenceEventDraft[K]) => {
    onChange(
      value.map((row, rowIndex) => (
        rowIndex === index
          ? { ...row, [field]: nextValue }
          : row
      )),
    );
  };

  const updateRowReviewStatus = (index: number, nextStatus: SequenceEventReviewStatus) => {
    onChange(
      value.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        if (nextStatus === "keep") {
          const nextRow = { ...row } as SequenceEventDraft;
          delete nextRow.review_status;
          delete nextRow.review_reason;
          return nextRow;
        }

        return {
          ...row,
          review_status: nextStatus,
        };
      }),
    );
  };

  const addRow = () => {
    onChange([
      ...value,
      {
        date_time: "",
        event: "",
        supporting_fact_ids: "",
        supporting_evidence_references: "",
        confidence: "",
      },
    ]);
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div className="flex flex-col gap-4" data-testid="sequence-of-events-editor">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Structured Editing</p>
          <p className="mt-0.5 text-xs text-[#6b6b7a]">
            Edit the sequence as discrete event rows. The saved draft still persists as the same JSON array.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-1.5 text-xs font-semibold text-[#111118] hover:bg-[#f4f4f6]"
          data-testid="sequence-add-event-button"
        >
          <Plus size={12} />
          Add Event
        </button>
      </div>

      {value.length === 0 ? (
        <div className="flex-1 rounded-xl border border-dashed border-[rgba(0,0,0,0.12)] bg-[#fafafa] px-4 py-8 text-sm text-[#6b6b7a]">
          No sequence events yet. Add the first event to begin structuring the timeline.
        </div>
      ) : (
        <div className="space-y-3 pr-1">
          {value.map((row, index) => (
            <div
              key={`sequence-event-${index}`}
              className={`rounded-xl border p-4 ${(row.review_status || "keep") === "candidate_drop"
                  ? "border-amber-300 bg-amber-50"
                  : (row.review_status || "keep") === "candidate_review"
                    ? "border-blue-200 bg-blue-50"
                    : (row.review_status || "keep") === "invalid_unrenderable"
                      ? "border-rose-300 bg-rose-50"
                      : "border-[rgba(0,0,0,0.08)] bg-white"
                }`}
              data-testid={`sequence-event-row-${index}`}
              data-review-status={row.review_status || "keep"}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#111118]">Event {index + 1}</p>
                <div className="flex items-center gap-2">
                  <select
                    value={row.review_status || "keep"}
                    onChange={(event) => updateRowReviewStatus(index, event.target.value as SequenceEventReviewStatus)}
                    data-testid={`sequence-event-review-status-${index}`}
                    className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d]"
                  >
                    <option value="keep">Keep</option>
                    <option value="candidate_review">Candidate review</option>
                    <option value="candidate_drop">Candidate drop</option>
                    <option value="invalid_unrenderable">Invalid / unrenderable</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="text-xs font-semibold text-[#c0172d] hover:underline"
                    data-testid={`sequence-remove-event-button-${index}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
              {(row.review_status || "keep") !== "keep" && (
                <div className="mt-3 rounded-lg border border-dashed border-[rgba(0,0,0,0.12)] bg-white/70 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Review status</p>
                  <p className="mt-0.5 text-xs text-[#111118]" data-testid={`sequence-event-review-note-${index}`}>
                    {row.review_reason || "Marked for investigator review."}
                  </p>
                </div>
              )}
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Date / Time</span>
                  <input
                    value={row.date_time}
                    onChange={(event) => updateRow(index, "date_time", event.target.value)}
                    className="rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] px-3 py-2 text-sm text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
                    placeholder="e.g. 14 May 2026, 08:00"
                    data-testid={`sequence-event-date-time-${index}`}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Supporting Fact IDs</span>
                  <input
                    value={row.supporting_fact_ids}
                    onChange={(event) => updateRow(index, "supporting_fact_ids", event.target.value)}
                    className="rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] px-3 py-2 text-sm text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
                    placeholder="e.g. F1, F2"
                    data-testid={`sequence-event-supporting-fact-ids-${index}`}
                  />
                </label>
                <label className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Supporting Evidence References</span>
                  <input
                    value={row.supporting_evidence_references}
                    onChange={(event) => updateRow(index, "supporting_evidence_references", event.target.value)}
                    className="rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] px-3 py-2 text-sm text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
                    placeholder="e.g. evidence:EV-001"
                    data-testid={`sequence-event-supporting-evidence-refs-${index}`}
                  />
                </label>
                <label className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Confidence</span>
                  <input
                    value={row.confidence}
                    onChange={(event) => updateRow(index, "confidence", event.target.value)}
                    className="rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] px-3 py-2 text-sm text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
                    placeholder="0.0 to 1.0"
                    data-testid={`sequence-event-confidence-${index}`}
                  />
                </label>
                <label className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Event</span>
                  <SequenceEventDescriptionField
                    value={row.event}
                    onChange={(value) => updateRow(index, "event", value)}
                    placeholder="Describe the timeline event"
                    testId={`sequence-event-description-${index}`}
                  />
                </label>
              </div>
              <div className="mt-3">
                <AutoGrowEditField
                  label="Review Reason"
                  value={row.review_reason || ""}
                  rows={2}
                  onChange={(nextValue) => updateRow(index, "review_reason", nextValue)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeBackgroundParagraphText(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item || "").split(/\r?\n\s*\r?\n/))
      .map((item) => item.trim())
      .filter(Boolean)
      .join("\n\n");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    try {
      return normalizeBackgroundParagraphText(JSON.parse(trimmed));
    } catch {
      return trimmed
        .split(/\r?\n\s*\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
        .join("\n\n");
    }
  }

  return "";
}

function splitBackgroundParagraphs(value: string) {
  return value
    .split(/\r?\n\s*\r?\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitBackgroundFactIds(value: string) {
  return value
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBackgroundFactIdText(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    try {
      return normalizeBackgroundFactIdText(JSON.parse(trimmed));
    } catch {
      return trimmed
        .split(/[\r\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .join("\n");
    }
  }

  return "";
}

function normalizeBackgroundInformationContent(value: unknown): BackgroundInformationDraft {
  let source: unknown = value;

  if (source && typeof source === "object" && !Array.isArray(source)) {
    const record = source as Record<string, unknown>;
    if ("background_information" in record) {
      source = record.background_information;
    }
  }

  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) {
      source = null;
    } else {
      try {
        source = JSON.parse(trimmed);
      } catch {
        return {
          process_description: trimmed,
          equipment_involved: "",
          utility_involved: "",
          manufacturing_context: "",
          reviewed_fact_ids: "",
        };
      }
    }
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {
      process_description: "",
      equipment_involved: "",
      utility_involved: "",
      manufacturing_context: "",
      reviewed_fact_ids: "",
    };
  }

  const record = source as Record<string, unknown>;
  const processContext = normalizeBackgroundParagraphText(record.process_context);
  const equipmentContext = normalizeBackgroundParagraphText(record.equipment_utilities_context);
  const sourceReferences = normalizeBackgroundFactIdText(record.source_references);
  const missingInformation = normalizeBackgroundParagraphText(record.missing_information);
  return {
    process_description: normalizeBackgroundParagraphText(record.process_description) || normalizeBackgroundParagraphText(record.summary) || processContext,
    equipment_involved: normalizeBackgroundParagraphText(record.equipment_involved) || equipmentContext,
    utility_involved: normalizeBackgroundParagraphText(record.utility_involved),
    manufacturing_context: normalizeBackgroundParagraphText(record.manufacturing_context) || processContext,
    reviewed_fact_ids: normalizeBackgroundFactIdText(record.reviewed_fact_ids) || sourceReferences,
  };
}

function serializeBackgroundInformationContent(value: BackgroundInformationDraft) {
  const cleaned = {
    process_description: splitBackgroundParagraphs(value.process_description),
    equipment_involved: splitBackgroundParagraphs(value.equipment_involved),
    utility_involved: splitBackgroundParagraphs(value.utility_involved),
    manufacturing_context: splitBackgroundParagraphs(value.manufacturing_context),
    reviewed_fact_ids: splitBackgroundFactIds(value.reviewed_fact_ids),
  };

  return JSON.stringify(cleaned, null, 2);
}

function BackgroundNarrativeField({
  label,
  helper,
  value,
  onChange,
  placeholder,
  testIdPrefix,
  minHeight = 160,
  rows = 5,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  testIdPrefix: string;
  minHeight?: number;
  rows?: number;
}) {
  const textareaRef = useAutoResizeTextarea(value, minHeight);

  return (
    <section className="space-y-2" data-testid={`${testIdPrefix}-field`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#111118]">{label}</p>
          {helper ? <p className="mt-0.5 text-[11px] text-[#6b6b7a]">{helper}</p> : null}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={{ minHeight }}
        className="w-full overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 text-sm leading-6 text-[#111118] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.01)] resize-none focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
        data-testid={`${testIdPrefix}-textarea`}
      />
    </section>
  );
}

function BackgroundEditor({
  value,
  onChange,
}: {
  value: BackgroundInformationDraft;
  onChange: (next: BackgroundInformationDraft) => void;
}) {
  const updateField = <K extends keyof BackgroundInformationDraft>(field: K, nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <div className="flex flex-col gap-5" data-testid="background-information-editor">
      <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-[#fbfbfc] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Narrative editing</p>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-[#6b6b7a]">
          Write the Background like a report section. Each field accepts prose, and the saved draft still goes back to the same JSON payload.
        </p>
      </div>

      <div className="space-y-6 pr-1">
        <BackgroundNarrativeField
          label="Process Description"
          helper="Summarize the process, campaign, or operating context in one or more paragraphs."
          value={value.process_description}
          onChange={(nextValue) => updateField("process_description", nextValue)}
          placeholder="Describe the process context..."
          testIdPrefix="background-process-description"
        />
        <BackgroundNarrativeField
          label="Equipment Involved"
          helper="Describe equipment, materials, or tools that matter to the reader."
          value={value.equipment_involved}
          onChange={(nextValue) => updateField("equipment_involved", nextValue)}
          placeholder="Describe equipment or materials..."
          testIdPrefix="background-equipment-involved"
        />
        <BackgroundNarrativeField
          label="Manufacturing Context"
          helper="Capture product, batch, lot, or line context that frames the event."
          value={value.manufacturing_context}
          onChange={(nextValue) => updateField("manufacturing_context", nextValue)}
          placeholder="Describe the batch or manufacturing context..."
          testIdPrefix="background-manufacturing-context"
        />
        <BackgroundNarrativeField
          label="Scope of Event"
          helper="Explain the immediate scope, boundaries, and what is or is not included."
          value={value.utility_involved}
          onChange={(nextValue) => updateField("utility_involved", nextValue)}
          placeholder="Describe the scope of the event..."
          testIdPrefix="background-scope-of-event"
        />
        <BackgroundNarrativeField
          label="Additional Context"
          helper="List reviewed fact IDs and any short contextual notes the reader should carry forward."
          value={value.reviewed_fact_ids}
          onChange={(nextValue) => updateField("reviewed_fact_ids", nextValue)}
          placeholder="Enter fact IDs or short context, one per line..."
          testIdPrefix="background-additional-context"
        />
      </div>
    </div>
  );
}

function normalizeFindingsNarrativeContent(value: unknown): FindingsNarrativeDraft {
  let source: unknown = value;

  if (source && typeof source === "object" && !Array.isArray(source)) {
    const record = source as Record<string, unknown>;
    if ("investigation" in record) {
      source = record.investigation;
    } else if (
      "detailed_description" in record
      || "immediate_actions" in record
      || "investigation_narrative" in record
    ) {
      source = record;
    }
  }

  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) {
      return {
        detailed_description: "",
        immediate_actions: "",
        investigation_narrative: "",
      };
    }

    try {
      return normalizeFindingsNarrativeContent(JSON.parse(trimmed));
    } catch {
      return {
        detailed_description: "",
        immediate_actions: "",
        investigation_narrative: trimmed,
      };
    }
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {
      detailed_description: "",
      immediate_actions: "",
      investigation_narrative: "",
    };
  }

  const record = source as Record<string, unknown>;
  return {
    detailed_description: String(record.detailed_description || "").trim(),
    immediate_actions: String(record.immediate_actions || "").trim(),
    investigation_narrative: String(record.investigation_narrative || "").trim(),
  };
}

function serializeFindingsNarrativeContent(value: FindingsNarrativeDraft) {
  return JSON.stringify(
    {
      detailed_description: String(value.detailed_description || "").trim(),
      immediate_actions: String(value.immediate_actions || "").trim(),
      investigation_narrative: String(value.investigation_narrative || "").trim(),
    },
    null,
    2,
  );
}

function normalizeBooleanLike(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (["false", "no", "0", "n", "off"].includes(normalized)) {
    return false;
  }

  if (["true", "yes", "1", "y", "on"].includes(normalized)) {
    return true;
  }

  return fallback;
}

function parseBooleanLike(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (["false", "no"].includes(normalized)) {
    return false;
  }

  if (["true", "yes"].includes(normalized)) {
    return true;
  }

  return undefined;
}

function normalizeErrorClassificationContent(value: unknown): ErrorClassificationDraft {
  let source: unknown = value;

  if (source && typeof source === "object" && !Array.isArray(source)) {
    const record = source as Record<string, unknown>;
    if ("error_classification" in record) {
      source = record.error_classification;
    }
  }

  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) {
      return {
        draft_classification: "",
        human_review_required: true,
        error_classification_level_i: "",
        error_classification_level_ii: "",
        error_classification_level_iii: "",
        other_classification: "",
        reviewed_fact_ids: "",
      };
    }

    try {
      return normalizeErrorClassificationContent(JSON.parse(trimmed));
    } catch {
      return {
        draft_classification: trimmed,
        human_review_required: true,
        error_classification_level_i: "",
        error_classification_level_ii: "",
        error_classification_level_iii: "",
        other_classification: "",
        reviewed_fact_ids: "",
      };
    }
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {
      draft_classification: "",
      human_review_required: true,
      error_classification_level_i: "",
      error_classification_level_ii: "",
      error_classification_level_iii: "",
      other_classification: "",
      reviewed_fact_ids: "",
    };
  }

  const record = source as Record<string, unknown>;
  return {
    draft_classification: normalizeBackgroundParagraphText(record.draft_classification),
    human_review_required: normalizeBooleanLike(record.human_review_required, true),
    error_classification_level_i: normalizeBackgroundParagraphText(record.error_classification_level_i),
    error_classification_level_ii: normalizeBackgroundParagraphText(record.error_classification_level_ii),
    error_classification_level_iii: normalizeBackgroundParagraphText(record.error_classification_level_iii),
    other_classification: normalizeBackgroundParagraphText(record.other_classification),
    reviewed_fact_ids: normalizeBackgroundFactIdText(record.reviewed_fact_ids),
  };
}

function normalizeErrorClassificationDebugContent(value: unknown): ErrorClassificationDebugInfo {
  let source: unknown = value;

  if (source && typeof source === "object" && !Array.isArray(source)) {
    const record = source as Record<string, unknown>;
    if ("error_classification" in record) {
      source = record.error_classification;
    }
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {
      raw_llm_response: "",
      llm_validation_error: "",
      llm_response_status: "",
    };
  }

  const record = source as Record<string, unknown>;
  return {
    raw_llm_response: String(record.raw_llm_response || "").trim(),
    llm_validation_error: String(record.llm_validation_error || "").trim(),
    llm_response_status: String(record.llm_response_status || "").trim(),
  };
}

function serializeErrorClassificationContent(value: ErrorClassificationDraft) {
  return JSON.stringify(
    {
      draft_classification: String(value.draft_classification || "").trim(),
      human_review_required: Boolean(value.human_review_required),
      error_classification_level_i: String(value.error_classification_level_i || "").trim(),
      error_classification_level_ii: String(value.error_classification_level_ii || "").trim(),
      error_classification_level_iii: String(value.error_classification_level_iii || "").trim(),
      other_classification: String(value.other_classification || "").trim(),
      reviewed_fact_ids: splitBackgroundFactIds(value.reviewed_fact_ids),
    },
    null,
    2,
  );
}

function normalizeHealthHazardAssessmentContent(value: unknown): HealthHazardAssessmentDraft {
  let source: unknown = value;

  if (source && typeof source === "object" && !Array.isArray(source)) {
    const record = source as Record<string, unknown>;
    if ("health_hazard_assessment" in record) {
      source = record.health_hazard_assessment;
    }
  }

  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) {
      return {
        assessment_required: "Unable To Determine",
        justification: "",
        reviewed_fact_ids: "",
      };
    }

    try {
      return normalizeHealthHazardAssessmentContent(JSON.parse(trimmed));
    } catch {
      return {
        assessment_required: "Unable To Determine",
        justification: trimmed,
        reviewed_fact_ids: "",
      };
    }
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {
      assessment_required: "Unable To Determine",
      justification: "",
      reviewed_fact_ids: "",
    };
  }

  const record = source as Record<string, unknown>;
  return {
    assessment_required: String(record.assessment_required || "Unable To Determine").trim() || "Unable To Determine",
    justification: normalizeBackgroundParagraphText(record.justification),
    reviewed_fact_ids: normalizeBackgroundFactIdText(record.reviewed_fact_ids),
  };
}

function serializeHealthHazardAssessmentContent(value: HealthHazardAssessmentDraft) {
  return JSON.stringify(
    {
      assessment_required: String(value.assessment_required || "").trim() || "Unable To Determine",
      justification: String(value.justification || "").trim(),
      reviewed_fact_ids: splitBackgroundFactIds(value.reviewed_fact_ids),
    },
    null,
    2,
  );
}

function normalizeImpactAssessmentContent(value: unknown): ImpactAssessmentDraft {
  let source: unknown = value;

  if (source && typeof source === "object" && !Array.isArray(source)) {
    const record = source as Record<string, unknown>;
    if ("impact_assessment" in record) {
      source = record.impact_assessment;
    }
  }

  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) {
      return {
        impact_summary: "",
        product_quality_impact: "",
        patient_safety_impact: "",
        operational_impact: "",
        reviewed_fact_ids: "",
      };
    }

    try {
      return normalizeImpactAssessmentContent(JSON.parse(trimmed));
    } catch {
      return {
        impact_summary: trimmed,
        product_quality_impact: "",
        patient_safety_impact: "",
        operational_impact: "",
        reviewed_fact_ids: "",
      };
    }
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return {
      impact_summary: "",
      product_quality_impact: "",
      patient_safety_impact: "",
      operational_impact: "",
      reviewed_fact_ids: "",
    };
  }

  const record = source as Record<string, unknown>;
  return {
    impact_summary: normalizeBackgroundParagraphText(record.impact_summary),
    product_quality_impact: normalizeBackgroundParagraphText(record.product_quality_impact),
    patient_safety_impact: normalizeBackgroundParagraphText(record.patient_safety_impact),
    operational_impact: normalizeBackgroundParagraphText(record.operational_impact),
    reviewed_fact_ids: normalizeBackgroundFactIdText(record.reviewed_fact_ids),
  };
}

function serializeImpactAssessmentContent(value: ImpactAssessmentDraft) {
  return JSON.stringify(
    {
      impact_summary: String(value.impact_summary || "").trim(),
      product_quality_impact: String(value.product_quality_impact || "").trim(),
      patient_safety_impact: String(value.patient_safety_impact || "").trim(),
      operational_impact: String(value.operational_impact || "").trim(),
      reviewed_fact_ids: splitBackgroundFactIds(value.reviewed_fact_ids),
    },
    null,
    2,
  );
}

function FindingsNarrativeField({
  label,
  helper,
  value,
  onChange,
  placeholder,
  testIdPrefix,
  minHeight = 160,
  rows = 5,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  testIdPrefix: string;
  minHeight?: number;
  rows?: number;
}) {
  const textareaRef = useAutoResizeTextarea(value, minHeight);

  return (
    <section className="space-y-2" data-testid={`${testIdPrefix}-field`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#111118]">{label}</p>
          {helper ? <p className="mt-0.5 text-[11px] text-[#6b6b7a]">{helper}</p> : null}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={{ minHeight }}
        className="w-full overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 text-sm leading-6 text-[#111118] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.01)] resize-none focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
        data-testid={`${testIdPrefix}-textarea`}
      />
    </section>
  );
}

function FindingsNarrativeEditor({
  value,
  onChange,
}: {
  value: FindingsNarrativeDraft;
  onChange: (next: FindingsNarrativeDraft) => void;
}) {
  const updateField = <K extends keyof FindingsNarrativeDraft>(field: K, nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <div className="flex flex-col gap-5" data-testid="findings-narrative-editor">
      <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-[#fbfbfc] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Narrative editing</p>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-[#6b6b7a]">
          Write the findings as a readable investigation narrative. The saved draft still persists as the same JSON object.
        </p>
      </div>

      <div className="space-y-6 pr-1">
        <FindingsNarrativeField
          label="Detailed Description"
          helper="Summarize the key issue or observed condition in narrative form."
          value={value.detailed_description}
          onChange={(nextValue) => updateField("detailed_description", nextValue)}
          placeholder="Describe what was observed..."
          testIdPrefix="findings-detailed-description"
        />
        <FindingsNarrativeField
          label="Immediate Actions"
          helper="Capture containment, escalation, or short-term actions taken."
          value={value.immediate_actions}
          onChange={(nextValue) => updateField("immediate_actions", nextValue)}
          placeholder="Describe the immediate actions..."
          testIdPrefix="findings-immediate-actions"
        />
        <FindingsNarrativeField
          label="Investigation Narrative"
          helper="Document the narrative explanation, supporting evidence, and why the findings matter."
          value={value.investigation_narrative}
          onChange={(nextValue) => updateField("investigation_narrative", nextValue)}
          placeholder="Write the full investigation narrative..."
          testIdPrefix="findings-investigation-narrative"
        />
      </div>
    </div>
  );
}

function StructuredBooleanField({
  label,
  helper,
  value,
  onChange,
  testId,
}: {
  label: string;
  helper: string;
  value: boolean;
  onChange: (next: boolean) => void;
  testId: string;
}) {
  return (
    <section className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#fbfbfc] px-4 py-3" data-testid={`${testId}-field`}>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-[rgba(0,0,0,0.2)] text-[#c0172d] focus:ring-[#c0172d]"
          data-testid={`${testId}-checkbox`}
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[#111118]">{label}</span>
          <span className="mt-0.5 block text-[11px] text-[#6b6b7a]">{helper}</span>
        </span>
      </label>
    </section>
  );
}

function ErrorClassificationEditor({
  value,
  debugInfo,
  onChange,
}: {
  value: ErrorClassificationDraft;
  debugInfo: ErrorClassificationDebugInfo;
  onChange: (next: ErrorClassificationDraft) => void;
}) {
  const updateField = <K extends keyof ErrorClassificationDraft>(field: K, nextValue: ErrorClassificationDraft[K]) => {
    onChange({ ...value, [field]: nextValue });
  };
  const hasDebugInfo = Boolean(
    debugInfo.raw_llm_response || debugInfo.llm_validation_error || debugInfo.llm_response_status,
  );

  return (
    <div className="flex flex-col gap-5" data-testid="error-classification-editor">
      <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-[#fbfbfc] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Narrative editing</p>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-[#6b6b7a]">
          Write the classification in report language while keeping the same saved JSON payload behind the scenes.
        </p>
      </div>

      <div className="space-y-6 pr-1">
        <BackgroundNarrativeField
          label="Draft Classification"
          helper="Capture the classification headline or summary in narrative form."
          value={value.draft_classification}
          onChange={(nextValue) => updateField("draft_classification", nextValue)}
          placeholder="Summarize the classification..."
          testIdPrefix="error-classification-draft-classification"
        />
        <StructuredBooleanField
          label="Human Review Required"
          helper="Toggle this when the classification still needs investigator or SME review."
          value={value.human_review_required}
          onChange={(nextValue) => updateField("human_review_required", nextValue)}
          testId="error-classification-human-review-required"
        />
        <BackgroundNarrativeField
          label="Level I"
          helper="Describe the broad classification level in plain language."
          value={value.error_classification_level_i}
          onChange={(nextValue) => updateField("error_classification_level_i", nextValue)}
          placeholder="Describe level I classification..."
          testIdPrefix="error-classification-level-i"
        />
        <BackgroundNarrativeField
          label="Level II"
          helper="Add the intermediate classification detail that supports the final call."
          value={value.error_classification_level_ii}
          onChange={(nextValue) => updateField("error_classification_level_ii", nextValue)}
          placeholder="Describe level II classification..."
          testIdPrefix="error-classification-level-ii"
        />
        <BackgroundNarrativeField
          label="Level III"
          helper="Capture the most specific classification detail or event descriptor."
          value={value.error_classification_level_iii}
          onChange={(nextValue) => updateField("error_classification_level_iii", nextValue)}
          placeholder="Describe level III classification..."
          testIdPrefix="error-classification-level-iii"
        />
        <BackgroundNarrativeField
          label="Other Classification"
          helper="Record any additional classification note or reviewer context."
          value={value.other_classification}
          onChange={(nextValue) => updateField("other_classification", nextValue)}
          placeholder="Enter any additional classification note..."
          testIdPrefix="error-classification-other-classification"
        />
        <BackgroundNarrativeField
          label="Reviewed Fact IDs"
          helper="List the fact IDs that support the classification."
          value={value.reviewed_fact_ids}
          onChange={(nextValue) => updateField("reviewed_fact_ids", nextValue)}
          placeholder="Enter fact IDs, one per line..."
          testIdPrefix="error-classification-reviewed-fact-ids"
        />
      </div>

      {hasDebugInfo ? (
        <details className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#fbfbfc] px-5 py-4" data-testid="error-classification-raw-llm-response-panel">
          <summary className="cursor-pointer list-none text-sm font-semibold text-[#111118] focus:outline-none">
            <span data-testid="error-classification-raw-llm-response-toggle">Show raw LLM response</span>
          </summary>
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6b6b7a]">
              {debugInfo.llm_response_status ? (
                <span className="rounded-full bg-white px-2 py-1 font-semibold text-[#111118] ring-1 ring-[rgba(0,0,0,0.08)]" data-testid="error-classification-llm-response-status">
                  {debugInfo.llm_response_status}
                </span>
              ) : null}
              <span>Raw model completion only. No chain-of-thought is stored or displayed.</span>
            </div>
            {debugInfo.llm_validation_error ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="error-classification-llm-validation-error">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Validation error</p>
                <p className="mt-1 whitespace-pre-wrap break-words">{debugInfo.llm_validation_error}</p>
              </div>
            ) : null}
            {debugInfo.raw_llm_response ? (
              <pre
                className="max-h-96 overflow-auto rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 font-mono text-[11px] leading-5 text-[#111118] whitespace-pre-wrap break-words"
                data-testid="error-classification-raw-llm-response"
              >
                {debugInfo.raw_llm_response}
              </pre>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function HealthHazardAssessmentEditor({
  value,
  onChange,
}: {
  value: HealthHazardAssessmentDraft;
  onChange: (next: HealthHazardAssessmentDraft) => void;
}) {
  const updateField = <K extends keyof HealthHazardAssessmentDraft>(field: K, nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <div className="flex flex-col gap-5" data-testid="health-hazard-assessment-editor">
      <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-[#fbfbfc] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Narrative editing</p>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-[#6b6b7a]">
          Write the health-hazard assessment as a readable narrative while preserving the existing JSON payload.
        </p>
      </div>

      <div className="space-y-6 pr-1">
        <BackgroundNarrativeField
          label="Assessment Required"
          helper="Capture the assessment outcome, such as Yes, No, or Unable To Determine."
          value={value.assessment_required}
          onChange={(nextValue) => updateField("assessment_required", nextValue)}
          placeholder="State whether a health-hazard assessment is required..."
          testIdPrefix="health-hazard-assessment-required"
        />
        <BackgroundNarrativeField
          label="Justification"
          helper="Explain why the assessment outcome was reached."
          value={value.justification}
          onChange={(nextValue) => updateField("justification", nextValue)}
          placeholder="Explain the justification..."
          testIdPrefix="health-hazard-justification"
        />
        <BackgroundNarrativeField
          label="Reviewed Fact IDs"
          helper="List the supporting fact IDs that informed the assessment."
          value={value.reviewed_fact_ids}
          onChange={(nextValue) => updateField("reviewed_fact_ids", nextValue)}
          placeholder="Enter fact IDs, one per line..."
          testIdPrefix="health-hazard-reviewed-fact-ids"
        />
      </div>
    </div>
  );
}

function ImpactAssessmentEditor({
  value,
  onChange,
}: {
  value: ImpactAssessmentDraft;
  onChange: (next: ImpactAssessmentDraft) => void;
}) {
  const updateField = <K extends keyof ImpactAssessmentDraft>(field: K, nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <div className="flex flex-col gap-5" data-testid="impact-assessment-editor">
      <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-[#fbfbfc] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Narrative editing</p>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-[#6b6b7a]">
          Write the impact assessment like a report section instead of a JSON object.
        </p>
      </div>

      <div className="space-y-6 pr-1">
        <BackgroundNarrativeField
          label="Impact Summary"
          helper="Summarize the overall impact in clear report language."
          value={value.impact_summary}
          onChange={(nextValue) => updateField("impact_summary", nextValue)}
          placeholder="Summarize the impact..."
          testIdPrefix="impact-assessment-summary"
        />
        <BackgroundNarrativeField
          label="Product Quality Impact"
          helper="Describe the impact on product quality or disposition."
          value={value.product_quality_impact}
          onChange={(nextValue) => updateField("product_quality_impact", nextValue)}
          placeholder="Describe the product quality impact..."
          testIdPrefix="impact-assessment-product-quality-impact"
        />
        <BackgroundNarrativeField
          label="Patient Safety Impact"
          helper="Describe any patient safety implication or explain why none is supported."
          value={value.patient_safety_impact}
          onChange={(nextValue) => updateField("patient_safety_impact", nextValue)}
          placeholder="Describe the patient safety impact..."
          testIdPrefix="impact-assessment-patient-safety-impact"
        />
        <BackgroundNarrativeField
          label="Operational Impact"
          helper="Capture any manufacturing, containment, or scheduling impact."
          value={value.operational_impact}
          onChange={(nextValue) => updateField("operational_impact", nextValue)}
          placeholder="Describe the operational impact..."
          testIdPrefix="impact-assessment-operational-impact"
        />
        <BackgroundNarrativeField
          label="Reviewed Fact IDs"
          helper="List the fact IDs that support the impact assessment."
          value={value.reviewed_fact_ids}
          onChange={(nextValue) => updateField("reviewed_fact_ids", nextValue)}
          placeholder="Enter fact IDs, one per line..."
          testIdPrefix="impact-assessment-reviewed-fact-ids"
        />
      </div>
    </div>
  );
}

function buildDraftSourceFacts(workspace: WorkspaceCase | null) {
  return (workspace?.facts.accepted || []).map((fact) => ({
    fact_id: fact.fact_id,
    statement: fact.statement,
    category: fact.category,
    source_type: fact.source_type,
    evidence_id: fact.evidence_id,
    evidence_title: fact.evidence_title,
  }));
}

function buildDraftSourceEvidenceIds(workspace: WorkspaceCase | null) {
  return (workspace?.evidence || [])
    .map((item) => String(item.evidence_id || "").trim())
    .filter(Boolean);
}

function InvestigationStage({ onComplete, caseId, workspace, refreshWorkspace, setNotice }: WorkspaceStageProps) {
  const [sec, setSec] = useState<InvSec>("sequence");
  const [findTab, setFindTab] = useState<FindTab>("SOP Review");
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [rcaMethodId, setRcaMethodId] = useState<RcaMethodId>("brainstorming");
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [sequenceEventsDraft, setSequenceEventsDraft] = useState<SequenceEventDraft[]>(() => parseSequenceEventsContent(getInvestigationContentFromWorkspace(workspace, "sequence", "SOP Review")));
  const [backgroundDraft, setBackgroundDraft] = useState<BackgroundInformationDraft>(() => normalizeBackgroundInformationContent(getInvestigationContentFromWorkspace(workspace, "background", "SOP Review")));
  const [errorClassificationDraft, setErrorClassificationDraft] = useState<ErrorClassificationDraft>(() => normalizeErrorClassificationContent(getInvestigationContentFromWorkspace(workspace, "classification", "SOP Review")));
  const [healthHazardAssessmentDraft, setHealthHazardAssessmentDraft] = useState<HealthHazardAssessmentDraft>(() => normalizeHealthHazardAssessmentContent(getInvestigationContentFromWorkspace(workspace, "hazard", "SOP Review")));
  const [impactAssessmentDraft, setImpactAssessmentDraft] = useState<ImpactAssessmentDraft>(() => normalizeImpactAssessmentContent(getInvestigationContentFromWorkspace(workspace, "impact", "SOP Review")));
  const [findingsDraftBySection, setFindingsDraftBySection] = useState<Record<string, FindingsNarrativeDraft>>(() => ({
    "findings:SOP Review": normalizeFindingsNarrativeContent(getInitialFindingsNarrativeSource(workspace, "SOP Review")),
    "findings:Record Review": normalizeFindingsNarrativeContent(getInitialFindingsNarrativeSource(workspace, "Record Review")),
    "findings:Interviews": normalizeFindingsNarrativeContent(getInitialFindingsNarrativeSource(workspace, "Interviews")),
    "findings:Equipment": normalizeFindingsNarrativeContent(getInitialFindingsNarrativeSource(workspace, "Equipment")),
    "findings:Environmental": normalizeFindingsNarrativeContent(getInitialFindingsNarrativeSource(workspace, "Environmental")),
  }));
  const [contentBySection, setContentBySection] = useState<Record<string, string>>({
    sequence: getInvestigationContentFromWorkspace(workspace, "sequence", "SOP Review"),
    "findings:SOP Review": getInvestigationContentFromWorkspace(workspace, "findings", "SOP Review"),
    "findings:Record Review": getInvestigationContentFromWorkspace(workspace, "findings", "Record Review"),
    "findings:Interviews": getInvestigationContentFromWorkspace(workspace, "findings", "Interviews"),
    "findings:Equipment": getInvestigationContentFromWorkspace(workspace, "findings", "Equipment"),
    "findings:Environmental": getInvestigationContentFromWorkspace(workspace, "findings", "Environmental"),
    classification: getInvestigationContentFromWorkspace(workspace, "classification", "SOP Review"),
    hazard: getInvestigationContentFromWorkspace(workspace, "hazard", "SOP Review"),
    impact: getInvestigationContentFromWorkspace(workspace, "impact", "SOP Review"),
  });

  const currentSectionKey = buildInvestigationSectionKey(sec, findTab);
  const currentSectionTitle = buildInvestigationSectionTitle(sec, findTab);
  const currentSectionLabel = buildInvestigationSectionLabel(sec, findTab);
  const isStructuredSection = currentSectionKey === "background"
    || currentSectionKey.startsWith("findings:")
    || currentSectionKey === "classification"
    || currentSectionKey === "hazard"
    || currentSectionKey === "impact";
  const currentFindingsDraft = currentSectionKey.startsWith("findings:")
    ? findingsDraftBySection[currentSectionKey] || normalizeFindingsNarrativeContent(contentBySection[currentSectionKey] ?? getDefaultInvestigationContent(sec, findTab) ?? "")
    : null;
  const content = isStructuredSection
    ? ""
    : contentBySection[currentSectionKey] ?? getDefaultInvestigationContent(sec, findTab) ?? "";
  const selectedDraft = drafts.find((draft) => draft.draft_id === selectedDraftId) || null;
  const sequenceContent = serializeSequenceEventsContent(sequenceEventsDraft);
  const backgroundContent = serializeBackgroundInformationContent(backgroundDraft);
  const errorClassificationContent = serializeErrorClassificationContent(errorClassificationDraft);
  const healthHazardAssessmentContent = serializeHealthHazardAssessmentContent(healthHazardAssessmentDraft);
  const impactAssessmentContent = serializeImpactAssessmentContent(impactAssessmentDraft);
  const findingsContent = currentFindingsDraft ? serializeFindingsNarrativeContent(currentFindingsDraft) : "";
  const errorClassificationDebugInfo = normalizeErrorClassificationDebugContent(workspace?.error_classification);

  useEffect(() => {
    setContentBySection({
      sequence: getInvestigationContentFromWorkspace(workspace, "sequence", "SOP Review"),
      "findings:SOP Review": getInvestigationContentFromWorkspace(workspace, "findings", "SOP Review"),
      "findings:Record Review": getInvestigationContentFromWorkspace(workspace, "findings", "Record Review"),
      "findings:Interviews": getInvestigationContentFromWorkspace(workspace, "findings", "Interviews"),
      "findings:Equipment": getInvestigationContentFromWorkspace(workspace, "findings", "Equipment"),
      "findings:Environmental": getInvestigationContentFromWorkspace(workspace, "findings", "Environmental"),
      classification: getInvestigationContentFromWorkspace(workspace, "classification", "SOP Review"),
      hazard: getInvestigationContentFromWorkspace(workspace, "hazard", "SOP Review"),
      impact: getInvestigationContentFromWorkspace(workspace, "impact", "SOP Review"),
    });
    setSequenceEventsDraft(parseSequenceEventsContent(getInvestigationContentFromWorkspace(workspace, "sequence", "SOP Review")));
    setBackgroundDraft(normalizeBackgroundInformationContent(getInvestigationContentFromWorkspace(workspace, "background", "SOP Review")));
    setErrorClassificationDraft(normalizeErrorClassificationContent(getInvestigationContentFromWorkspace(workspace, "classification", "SOP Review")));
    setHealthHazardAssessmentDraft(normalizeHealthHazardAssessmentContent(getInvestigationContentFromWorkspace(workspace, "hazard", "SOP Review")));
    setImpactAssessmentDraft(normalizeImpactAssessmentContent(getInvestigationContentFromWorkspace(workspace, "impact", "SOP Review")));
    setFindingsDraftBySection({
      "findings:SOP Review": normalizeFindingsNarrativeContent(getInitialFindingsNarrativeSource(workspace, "SOP Review")),
      "findings:Record Review": normalizeFindingsNarrativeContent(getInitialFindingsNarrativeSource(workspace, "Record Review")),
      "findings:Interviews": normalizeFindingsNarrativeContent(getInitialFindingsNarrativeSource(workspace, "Interviews")),
      "findings:Equipment": normalizeFindingsNarrativeContent(getInitialFindingsNarrativeSource(workspace, "Equipment")),
      "findings:Environmental": normalizeFindingsNarrativeContent(getInitialFindingsNarrativeSource(workspace, "Environmental")),
    });
  }, [
    caseId,
    workspace?.sequence_of_events,
    workspace?.background_information,
    workspace?.investigation,
    workspace?.error_classification,
    workspace?.health_hazard_assessment,
    workspace?.impact_assessment,
  ]);

  const refreshDrafts = async () => {
    if (!caseId) {
      setDrafts([]);
      return;
    }

    setLoadingDrafts(true);
    try {
      setDrafts(await listCaseDrafts(caseId));
    } catch (error) {
      console.error("Failed to load drafts.", error);
      setDrafts([]);
    } finally {
      setLoadingDrafts(false);
    }
  };

  useEffect(() => {
    void refreshDrafts();
    setSec("sequence");
    setFindTab("SOP Review");
    setSelectedDraftId(null);
  }, [caseId]);

  const openDraft = (draft: DraftEntry) => {
    const parsed = parseInvestigationSectionKey(draft.section_key);
    setSec(parsed.sec);
    setFindTab(parsed.findTab);
    setSelectedDraftId(draft.draft_id);
    if (parsed.sec === "sequence") {
      setSequenceEventsDraft(parseSequenceEventsContent(draft.content));
    } else if (parsed.sec === "background") {
      setBackgroundDraft(normalizeBackgroundInformationContent(draft.content));
    } else if (parsed.sec === "classification") {
      setErrorClassificationDraft(normalizeErrorClassificationContent(draft.content));
    } else if (parsed.sec === "hazard") {
      setHealthHazardAssessmentDraft(normalizeHealthHazardAssessmentContent(draft.content));
    } else if (parsed.sec === "impact") {
      setImpactAssessmentDraft(normalizeImpactAssessmentContent(draft.content));
    } else if (parsed.sec === "findings") {
      setFindingsDraftBySection((prev) => ({
        ...prev,
        [draft.section_key]: normalizeFindingsNarrativeContent(draft.content),
      }));
    }
    setContentBySection((prev) => ({
      ...prev,
      [draft.section_key]: draft.content,
    }));
  };

  const saveCurrentDraft = async (createNew = false) => {
    if (!caseId) {
      return;
    }

    setSavingDraft(true);
    try {
      const payload = {
        section_key: currentSectionKey,
        title: currentSectionTitle,
        content: currentSectionKey === "sequence" ? sequenceContent
          : currentSectionKey === "background" ? backgroundContent
            : currentSectionKey === "classification" ? errorClassificationContent
              : currentSectionKey === "hazard" ? healthHazardAssessmentContent
                : currentSectionKey === "impact" ? impactAssessmentContent
                  : currentSectionKey.startsWith("findings:") ? findingsContent
                    : content,
        create_new_version: createNew,
        status: "draft",
        created_by: DRAFT_EDITOR_USER,
        last_edited_by: DRAFT_EDITOR_USER,
        source_facts: buildDraftSourceFacts(workspace),
        source_evidence_ids: buildDraftSourceEvidenceIds(workspace),
      };

      const savedDraft = selectedDraftId && !createNew
        ? await updateDraft(selectedDraftId, payload)
        : await saveCaseDraft(caseId, payload);

      setSelectedDraftId(savedDraft.draft_id);
      setContentBySection((prev) => ({
        ...prev,
        [savedDraft.section_key]: savedDraft.content,
      }));
      if (currentSectionKey === "classification") {
        setErrorClassificationDraft(normalizeErrorClassificationContent(savedDraft.content));
      } else if (currentSectionKey === "hazard") {
        setHealthHazardAssessmentDraft(normalizeHealthHazardAssessmentContent(savedDraft.content));
      } else if (currentSectionKey === "impact") {
        setImpactAssessmentDraft(normalizeImpactAssessmentContent(savedDraft.content));
      }
      await refreshDrafts();
      setNotice({
        kind: savedDraft.persistence_warning ? "info" : "success",
        message: savedDraft.persistence_warning || "Draft saved.",
      });
    } catch (error) {
      console.error("Failed to save draft.", error);
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to save draft.",
      });
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="w-48 shrink-0 border-r border-[rgba(0,0,0,0.08)] bg-[#fafafa] flex flex-col py-4 px-2.5">
        <p className="text-[9px] font-bold text-[#c8c8d0] uppercase tracking-widest px-2 mb-2">Sections</p>
        <div className="space-y-0.5">
          {INV_SECS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                setSec(id);
                setSelectedDraftId(null);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs leading-snug transition-colors ${sec === id ? "bg-[#c0172d]/10 text-[#c0172d] font-semibold" : "text-[#6b6b7a] hover:bg-[#f0f0f3] hover:text-[#111118]"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="px-2 pt-3 border-t border-[rgba(0,0,0,0.06)] mt-2">
          <p className="text-[9px] text-[#b0b0bc] font-medium">6 sections</p>
        </div>

        <div className="mt-3 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-[rgba(0,0,0,0.06)]">
            <p className="text-[9px] font-bold text-[#c8c8d0] uppercase tracking-widest">Saved Drafts</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loadingDrafts ? (
              <p className="px-3 py-3 text-xs text-[#6b6b7a]">Loading drafts...</p>
            ) : drafts.length === 0 ? (
              <p className="px-3 py-3 text-xs text-[#6b6b7a]">No drafts saved for this case yet.</p>
            ) : (
              <div className="space-y-2 p-2">
                {drafts.map((draft) => {
                  const isSelected = draft.draft_id === selectedDraftId;
                  return (
                    <button
                      key={draft.draft_id}
                      onClick={() => openDraft(draft)}
                      className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${isSelected ? "border-[#c0172d]/30 bg-[#fde8eb]" : "border-[rgba(0,0,0,0.08)] hover:bg-[#fafafa]"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-[#111118] truncate">{draft.title}</p>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#6b6b7a]">{draft.status}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-[#6b6b7a]">
                        {draft.section_key} Â· v{draft.version}
                      </p>
                      <p className="text-[10px] text-[#6b6b7a]">{new Date(draft.updated_at).toLocaleString()}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-w-0 min-h-0 flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[rgba(0,0,0,0.07)] shrink-0 bg-white">
          <div>
            <h3 className="text-sm font-bold text-[#111118]">{currentSectionTitle}</h3>
            <p className="text-[11px] text-[#6b6b7a] mt-0.5">Draft Â· Review and edit as needed</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-[#6b6b7a]"><Sparkles size={10} className="text-[#c0172d]" />Draft</span>
            <button
              onClick={() => void saveCurrentDraft(true)}
              disabled={savingDraft}
              className="flex items-center gap-1 text-[11px] text-[#6b6b7a] font-semibold px-2.5 py-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] hover:bg-[#f0f0f3] transition-colors disabled:opacity-50"
            >
              <Plus size={11} />New Draft
            </button>
            <button
              onClick={() => void saveCurrentDraft()}
              data-testid="investigation-save-draft-button"
              disabled={savingDraft}
              className="flex items-center gap-1 text-[11px] text-white font-semibold px-2.5 py-1.5 rounded-lg bg-[#c0172d] hover:bg-[#a8142a] transition-colors disabled:opacity-50"
            >
              <Save size={11} />{selectedDraft ? `Update Draft v${selectedDraft.version}` : "Save Draft"}
            </button>
          </div>
        </div>

        {sec === "findings" && (
          <div className="flex gap-1.5 px-6 py-3 border-b border-[rgba(0,0,0,0.06)] bg-[#fafafa] shrink-0 flex-wrap">
            {FIND_TABS.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setFindTab(t);
                  setSelectedDraftId(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${findTab === t ? "bg-[#111118] text-white border-[#111118]" : "bg-white text-[#6b6b7a] border-[rgba(0,0,0,0.1)] hover:text-[#111118]"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="px-6 py-6">
          <div className="flex flex-col gap-3">
            <div
              className="flex flex-col rounded-xl border border-[rgba(0,0,0,0.08)] bg-white"
              data-testid={sec === "sequence" || isStructuredSection ? "investigation-body-editor" : undefined}
            >
              <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Editable Draft Content</p>
                  <p className="text-[11px] text-[#6b6b7a] mt-0.5">Saving this text updates the draft store only until you apply it to the case workflow.</p>
                </div>
                <p className="text-[11px] text-[#6b6b7a] font-medium">{currentSectionLabel}</p>
              </div>
              {sec === "sequence" ? (
                <div className="px-4 py-3">
                  <SequenceEventsEditor value={sequenceEventsDraft} onChange={setSequenceEventsDraft} />
                </div>
              ) : sec === "background" ? (
                <div className="px-4 py-3">
                  <BackgroundEditor value={backgroundDraft} onChange={setBackgroundDraft} />
                </div>
              ) : sec === "findings" ? (
                <div className="px-4 py-3">
                  <FindingsNarrativeEditor
                    value={currentFindingsDraft || {
                      detailed_description: "",
                      immediate_actions: "",
                      investigation_narrative: "",
                    }}
                    onChange={(nextValue) =>
                      setFindingsDraftBySection((prev) => ({
                        ...prev,
                        [currentSectionKey]: nextValue,
                      }))
                    }
                  />
                </div>
              ) : sec === "classification" ? (
                <div className="px-4 py-3">
                  <ErrorClassificationEditor
                    value={errorClassificationDraft}
                    debugInfo={errorClassificationDebugInfo}
                    onChange={setErrorClassificationDraft}
                  />
                </div>
              ) : sec === "hazard" ? (
                <div className="px-4 py-3">
                  <HealthHazardAssessmentEditor value={healthHazardAssessmentDraft} onChange={setHealthHazardAssessmentDraft} />
                </div>
              ) : sec === "impact" ? (
                <div className="px-4 py-3">
                  <ImpactAssessmentEditor value={impactAssessmentDraft} onChange={setImpactAssessmentDraft} />
                </div>
              ) : (
                <textarea
                  data-testid="investigation-body-editor"
                  value={content}
                  onChange={(event) =>
                    setContentBySection((prev) => ({
                      ...prev,
                      [currentSectionKey]: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 text-sm leading-relaxed text-[#111118] resize-none overflow-y-visible focus:outline-none focus:ring-0 border-0"
                />
              )}
            </div>
            <div className="shrink-0 rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#fafafa] px-4 py-3">
              <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2">Draft Metadata</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Section Key</p>
                  <p className="text-[#111118] mt-0.5">{currentSectionKey}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Selected Draft</p>
                  <p className="text-[#111118] mt-0.5">{selectedDraft ? `${selectedDraft.title} v${selectedDraft.version}` : "New draft"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 px-6 pb-5 pt-0">
          <div className="mb-4 rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#fafafa] px-4 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">RCA Method</p>
                <p className="mt-1 text-xs text-[#6b6b7a]">
                  Choose the RCA path to run. Structured RCA preserves the current evidence-linked candidate-cause workflow.
                </p>
              </div>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#111118] md:items-end">
                <span>Method</span>
                <select
                  data-testid="rca-method-selector"
                  value={rcaMethodId}
                  onChange={(event) => setRcaMethodId(event.target.value as RcaMethodId)}
                  className="min-w-[220px] rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm text-[#111118] focus:outline-none focus:ring-2 focus:ring-[#c0172d]/20"
                >
                  <option value="brainstorming">Structured RCA</option>
                  <option value="five_whys">Five Whys RCA</option>
                </select>
              </label>
            </div>
            <p className="mt-3 text-[11px] text-[#6b6b7a]" data-testid="rca-method-description">
              {rcaMethodId === "five_whys"
                ? "Generates a true 5 Whys chain from the curated investigation outcomes and supporting evidence."
                : "Generates the structured brainstorming RCA with candidate causes, evidence links, and review-ready support levels."}
            </p>
          </div>
          <GenerateCTA
            label="Generate RCA"
            onGenerate={async () => {
              try {
                await generateRca(caseId, rcaMethodId);
                const refreshedWorkspace = await refreshWorkspace(caseId);
                if (!refreshedWorkspace) {
                  return;
                }

                if (!refreshedWorkspace.rca) {
                  setNotice({
                    kind: "error",
                    message: "RCA generation completed without content to display.",
                  });
                  return;
                }

                onComplete();
                setNotice({
                  kind: "success",
                  message: "RCA generated and ready for review.",
                });
              } catch (error) {
                setNotice({
                  kind: "error",
                  message: error instanceof Error ? error.message : "RCA generation failed.",
                });
              }
            }}
            note="Review all sections before generating the root cause analysis."
          />
        </div>
      </div>
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Stage 5: RCA Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface CausalFactor {
  id: number; title: string;
  evidence: string[]; narrative: string;
  whys?: FiveWhyStep[];
  cls: { type: string; category: string; l1: string; l2: string };
}

interface FiveWhyStep {
  whyNumber: number;
  question: string;
  answer: string;
  outcomeIds: string[];
  evidenceRefs: string[];
  confidence?: number;
}

const FACTORS: CausalFactor[] = [
  {
    id: 1, title: "Omission of mandatory dual-operator label reconciliation",
    evidence: [
      "BN3238646 batch record shows single operator signature on label reconciliation step (SOP-PKG-0047 Ã‚Â§4.3)",
      "Interview with R. Schulz confirms co-signer was unavailable and time pressure led to proceeding without sign-off",
      "Shift Supervisor T. Lang was not present and was unaware the check had been bypassed",
    ],
    narrative: "The immediate root cause is the failure to complete the required dual-operator label reconciliation check prior to label application, as required by SOP-PKG-0047 Rev. 3, Â§4.3. Contributing factors include production time pressure, co-signer unavailability, and ambiguous procedure language in the preamble ('where practicable') that may have been interpreted as permitting discretion.",
    whys: [
      {
        whyNumber: 1,
        question: "Why was incorrect labeling able to proceed?",
        answer: "The required dual-operator label reconciliation check was not completed before label application.",
        outcomeIds: ["RCA-1"],
        evidenceRefs: ["E1"],
        confidence: 0.92,
      },
      {
        whyNumber: 2,
        question: "Why was the reconciliation check not completed?",
        answer: "The assigned co-signer was unavailable and the operator proceeded under production time pressure.",
        outcomeIds: ["RCA-2"],
        evidenceRefs: ["E2"],
        confidence: 0.86,
      },
      {
        whyNumber: 3,
        question: "Why did the process allow a single operator to continue?",
        answer: "Supervisory oversight did not detect the bypass before labeling started.",
        outcomeIds: ["RCA-3"],
        evidenceRefs: ["E3"],
        confidence: 0.78,
      },
    ],
    cls: { type: "Procedural", category: "Process Control", l1: "Verification", l2: "Operator Verification" },
  },
  {
    id: 2, title: "Inadequate physical segregation of label stock in shared staging area",
    evidence: [
      "Line 3 packaging log confirms labels for BN3238646 and BN3238631 were stored adjacently without physical barriers",
      "QA Associate M. Hoffmann noted labels for multiple lots were visible on the packaging table at the time of detection",
      "No label storage segregation requirement exists in the current SOP-PKG-0047 Rev. 3",
    ],
    narrative: "The absence of a physical lot segregation requirement for label stock in the shared staging area created the conditions that enabled the mislabeling. While not the direct cause, this factor significantly increased the likelihood of a mix-up once the primary verification control was bypassed. The SOP does not currently specify segregation barriers or individual lot staging bins for pre-printed labels.",
    whys: [
      {
        whyNumber: 1,
        question: "Why were labels from multiple lots available at the labeling point?",
        answer: "Labels for BN3238646 and BN3238631 were staged adjacently in the shared packaging area.",
        outcomeIds: ["RCA-4"],
        evidenceRefs: ["E1", "E2"],
        confidence: 0.88,
      },
      {
        whyNumber: 2,
        question: "Why were adjacent lots not physically separated?",
        answer: "The current SOP does not require individual lot staging bins or physical segregation barriers.",
        outcomeIds: ["RCA-5"],
        evidenceRefs: ["E3"],
        confidence: 0.84,
      },
    ],
    cls: { type: "Systemic", category: "Facility / Equipment", l1: "Process Design", l2: "Storage Controls" },
  },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asTextArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asText(item)).filter(Boolean);
}

function asConfidence(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : undefined;
}

function formatConfidence(value?: number) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "";
}

function evidenceLabel(reference: string, workspace: WorkspaceCase | null) {
  const evidence = workspace?.evidence?.find((item) => item.evidence_id === reference || item.evidence_title === reference);
  if (!evidence) return reference;
  return evidence.evidence_title ? `${reference} - ${evidence.evidence_title}` : reference;
}

function rootCauseStatement(rca: Record<string, unknown>) {
  const rootCause = rca.root_cause;
  if (typeof rootCause === "string") return rootCause.trim();

  const rootCauseRecord = asRecord(rootCause);
  if (rootCauseRecord) {
    return asText(rootCauseRecord.statement);
  }

  return asText(rca.problem_statement) || "Root cause cannot be determined from available evidence.";
}

function mapWhyChain(rca: Record<string, unknown>, workspace: WorkspaceCase | null): FiveWhyStep[] {
  const rawChain = Array.isArray(rca.why_chain) ? rca.why_chain : [];
  return rawChain
    .map((item, index) => {
      const step = asRecord(item);
      if (!step) return null;

      const question = asText(step.question);
      const answer = asText(step.answer);
      if (!answer) return null;

      const evidenceRefs = asTextArray(step.supporting_evidence_references)
        .map((reference) => evidenceLabel(reference, workspace));

      const confidence = asConfidence(step.confidence);

      return {
        whyNumber: Number(step.why_number) || index + 1,
        question: question || `Why ${index + 1}`,
        answer,
        outcomeIds: asTextArray(step.supporting_outcome_ids),
        evidenceRefs,
        ...(confidence !== undefined ? { confidence } : {}),
      };
    })
    .filter((step): step is FiveWhyStep => Boolean(step));
}

function mapWorkspaceRcaFactors(workspace: WorkspaceCase | null): CausalFactor[] | null {
  const rca = asRecord(workspace?.rca);
  if (!rca) return null;

  const whys = mapWhyChain(rca, workspace);
  const rootStatement = rootCauseStatement(rca);
  const candidateCauses = Array.isArray(rca.candidate_causes) ? rca.candidate_causes : [];

  if (whys.length > 0) {
    const evidence = Array.from(new Set(whys.flatMap((why) => why.evidenceRefs)));
    return [{
      id: 1,
      title: rootStatement,
      evidence: evidence.length > 0 ? evidence : ["Evidence traceability is captured in the 5 Whys chain."],
      narrative: rootStatement,
      whys,
      cls: { type: "Evidence-backed", category: "5 Whys RCA", l1: "Causal Chain", l2: "Root Cause" },
    }];
  }

  if (candidateCauses.length > 0) {
    const factors = candidateCauses
      .map((item, index) => {
        const candidate = asRecord(item);
        if (!candidate) return null;
        const statement = asText(candidate.statement);
        if (!statement) return null;
        return {
          id: index + 1,
          title: statement,
          evidence: asTextArray(candidate.supporting_fact_ids).length > 0
            ? asTextArray(candidate.supporting_fact_ids)
            : ["Supporting facts require review."],
          narrative: statement,
          cls: { type: asText(candidate.support_level) || "Undetermined", category: "Candidate Cause", l1: "Evidence Review", l2: "Human Review" },
        };
      })
      .filter((factor): factor is CausalFactor => Boolean(factor));
    return factors.length > 0 ? factors : null;
  }

  if (rootStatement) {
    return [{
      id: 1,
      title: rootStatement,
      evidence: asTextArray(rca.supporting_fact_ids).length > 0 ? asTextArray(rca.supporting_fact_ids) : ["Supporting evidence requires review."],
      narrative: rootStatement,
      cls: { type: "Undetermined", category: "RCA", l1: "Evidence Review", l2: "Human Review" },
    }];
  }

  return null;
}

function FiveWhysReview(props: {
  rca: Record<string, unknown>;
  workspace: WorkspaceCase | null;
  rootCause: Record<string, unknown> | null;
  supportingFactIds: string[];
  supportingSectionIds: string[];
  evidenceGaps: string[];
}) {
  console.log("=== FIVE WHYS REVIEW ===");
  console.log(props.rca);
  const {
    rca,
    workspace,
    rootCause,
    supportingFactIds,
    supportingSectionIds,
    evidenceGaps,
  } = props;

  const nativePayload = asRecord(rca.native);
  const nativeFiveWhys = asRecord(nativePayload?.five_whys);
  const hasNativeFiveWhys = Boolean(nativeFiveWhys && Object.keys(nativeFiveWhys).length > 0);
  console.log("FiveWhysReview native", (rca as any)?.native?.five_whys);
  console.log("hasNativeFiveWhys", hasNativeFiveWhys);
  console.log("why_steps length", (nativeFiveWhys as any)?.why_steps?.length);
  const nestedFiveWhysResult = asRecord(rca.five_whys_result);
  const hasNestedFiveWhysResult = Boolean(nestedFiveWhysResult && Object.keys(nestedFiveWhysResult).length > 0);
  const fiveWhysResult = hasNestedFiveWhysResult
    ? nestedFiveWhysResult
    : rca;
  const displayFiveWhysResult = hasNativeFiveWhys ? nativeFiveWhys : fiveWhysResult;
  console.group("===== FiveWhysReview =====");
  console.log("Original RCA:", rca);
  console.log("native five_whys:", nativeFiveWhys);
  console.log("Using native five_whys:", hasNativeFiveWhys);
  console.log("five_whys_result:", rca.five_whys_result);
  console.log("Using nested five_whys_result:", hasNestedFiveWhysResult);
  console.log("Resolved display object:", displayFiveWhysResult);
  console.log("Display object keys:", Object.keys(displayFiveWhysResult));
  console.log("root_cause:", displayFiveWhysResult.root_cause);
  console.log("candidate_causes:", displayFiveWhysResult.candidate_causes);
  console.log("reasoning:", displayFiveWhysResult.reasoning);
  console.log("reasoning_summary:", displayFiveWhysResult.reasoning_summary);
  console.log("why_chain:", displayFiveWhysResult.why_chain);
  console.log("why_steps:", displayFiveWhysResult.why_steps);
  console.log("Entire display object JSON:");
  console.log(JSON.stringify(displayFiveWhysResult, null, 2));
  console.groupEnd();
  const problemStatement = hasNativeFiveWhys
    ? asText(displayFiveWhysResult.problem_statement)
    : asText(displayFiveWhysResult.problem_statement) || rootCauseStatement(rca);
  const whySteps = hasNativeFiveWhys
    ? (Array.isArray(displayFiveWhysResult.why_steps) ? displayFiveWhysResult.why_steps : [])
      .map((item, index) => {
        const step = asRecord(item);
        if (!step) return null;
        const answer = asText(step.answer);
        if (!answer) return null;
        return {
          whyNumber: Number(step.why_number) || index + 1,
          question: asText(step.question) || `Why ${index + 1}`,
          answer,
          outcomeIds: [],
          evidenceRefs: asTextArray(step.supporting_evidence_ids),
        };
      })
      .filter((step): step is FiveWhyStep => Boolean(step))
    : mapWhyChain(displayFiveWhysResult, workspace);
  const evidenceSummary = asRecord(displayFiveWhysResult.evidence_summary);
  const evidenceSummaryFacts = asTextArray(evidenceSummary?.supporting_fact_ids).length > 0
    ? asTextArray(evidenceSummary?.supporting_fact_ids)
    : supportingFactIds;
  const evidenceSummarySections = !hasNativeFiveWhys && asTextArray(evidenceSummary?.supporting_section_ids).length > 0
    ? asTextArray(evidenceSummary?.supporting_section_ids)
    : supportingSectionIds;
  const fiveWhysEvidenceGaps = hasNativeFiveWhys && asTextArray(evidenceSummary?.notable_gaps).length > 0
    ? asTextArray(evidenceSummary?.notable_gaps)
    : asTextArray(displayFiveWhysResult.evidence_gaps).length > 0
      ? asTextArray(displayFiveWhysResult.evidence_gaps)
      : evidenceGaps;
  const nativeHumanReviewRequired = parseBooleanLike(displayFiveWhysResult.human_review_required);
  const fallbackHumanReviewRequired = parseBooleanLike(rca.human_review_required);
  const humanReviewRequired = nativeHumanReviewRequired ?? fallbackHumanReviewRequired;
  const terminatedEarly = !hasNativeFiveWhys && (Boolean(displayFiveWhysResult.terminated_early) || (whySteps.length > 0 && whySteps.length < 5));
  const terminationReason = asText(displayFiveWhysResult.termination_reason)
    || (terminatedEarly ? "Additional investigation required to continue the Five Whys chain." : "");
  const finalRootCause = hasNativeFiveWhys
    ? asText(asRecord(displayFiveWhysResult.root_cause)?.statement)
    : asText(asRecord(displayFiveWhysResult.final_root_cause)?.statement)
    || asText(rootCause?.statement)
    || "";
  const finalRootCauseConfidence = hasNativeFiveWhys
    ? asConfidence(asRecord(displayFiveWhysResult.root_cause)?.confidence)
    : undefined;
  const reasoningSummary = hasNativeFiveWhys
    ? asText(displayFiveWhysResult.reasoning_summary)
    : "";
  const assumptions = hasNativeFiveWhys
    ? asTextArray(displayFiveWhysResult.assumptions)
    : [];

  return (
    <div className="space-y-3" data-testid="five-whys-review">
      <div className="rounded-xl border border-[rgba(0,0,0,0.09)] bg-white overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2">Problem Statement</p>
          <p className="text-sm font-semibold text-[#111118]" data-testid="five-whys-problem-statement">{problemStatement || "Problem statement unavailable."}</p>
        </div>
      </div>

      {whySteps.map((why) => {
        const confidence = formatConfidence(why.confidence);
        const supportingEvidence = why.evidenceRefs.length > 0
          ? why.evidenceRefs
          : why.outcomeIds.length > 0
            ? why.outcomeIds.map((outcomeId) => `Outcome ${outcomeId}`)
            : ["Additional investigation required."];

        return (
          <div key={why.whyNumber} className="rounded-xl border border-[rgba(0,0,0,0.09)] bg-white overflow-hidden" data-testid={`five-whys-step-${why.whyNumber}`}>
            <div className="px-4 py-3.5 border-b border-[rgba(0,0,0,0.06)]">
              <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Why {why.whyNumber}</p>
              <p className="mt-2 text-xs font-semibold text-[#111118] leading-snug">{why.question}</p>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2">Answer</p>
                <p className="text-sm text-[#111118] leading-relaxed" data-testid={`five-whys-answer-${why.whyNumber}`}>{why.answer}</p>
                {confidence && <p className="mt-2 text-[11px] text-[#6b6b7a]">Confidence: {confidence}</p>}
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2">Supporting Evidence</p>
                <div className="space-y-1.5">
                  {supportingEvidence.map((evidence, index) => (
                    <div key={`${why.whyNumber}-${index}`} className="rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#f9f9fb] px-3 py-2 text-xs text-[#111118] leading-relaxed">
                      {evidence}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {terminatedEarly && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" data-testid="five-whys-termination">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Chain Terminated</p>
          <p className="mt-1 text-sm text-amber-900">{terminationReason}</p>
        </div>
      )}

      <div className="rounded-xl border border-[rgba(0,0,0,0.09)] bg-white overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2">Final Root Cause</p>
          <p className="text-sm font-semibold text-[#111118]" data-testid="five-whys-final-root-cause">{finalRootCause}</p>
          {finalRootCauseConfidence !== undefined && (
            <p className="mt-1 text-[11px] text-[#6b6b7a]">Confidence: {formatConfidence(finalRootCauseConfidence)}</p>
          )}
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {reasoningSummary && (
            <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#fafafa] p-3 md:col-span-2">
              <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Reasoning Summary</p>
              <p className="mt-1 text-xs text-[#111118] leading-relaxed">{reasoningSummary}</p>
            </div>
          )}
          {assumptions.length > 0 && (
            <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#fafafa] p-3 md:col-span-2">
              <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Assumptions</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-[#111118] leading-relaxed space-y-1">
                {assumptions.map((assumption, index) => (
                  <li key={index}>{assumption}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#fafafa] p-3">
            <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Evidence Summary</p>
            <p className="mt-1 text-xs text-[#111118] leading-relaxed">
              Facts: {evidenceSummaryFacts.length > 0 ? evidenceSummaryFacts.join(", ") : "None"}
            </p>
            <p className="mt-1 text-xs text-[#111118] leading-relaxed">
              Sections: {evidenceSummarySections.length > 0 ? evidenceSummarySections.join(", ") : "None"}
            </p>
          </div>
          <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#fafafa] p-3">
            <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Human Review Required</p>
            <p className="mt-1 text-xs text-[#111118]">{humanReviewRequired === true ? "Yes" : humanReviewRequired === false ? "No" : "Not available"}</p>
          </div>
          <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#fafafa] p-3 md:col-span-2">
            <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Evidence Gaps</p>
            <p className="mt-1 text-xs text-[#111118]" data-testid="five-whys-evidence-gaps">
              {fiveWhysEvidenceGaps.length > 0 ? fiveWhysEvidenceGaps.join(" | ") : "None"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RCAStage({ onComplete, caseId, workspace }: WorkspaceStageProps) {
  const [open, setOpen] = useState<number>(1);
  const rca = asRecord(workspace?.rca);
  console.log("=== RCA STAGE ===");
  console.log("workspace =", workspace);
  console.log("rca =", rca);
  console.log("workspace.rca.native", (workspace as any)?.rca?.native);
  console.log("root cause =", (rca as any)?.root_cause?.statement);
  const reasoning = asText(rca?.reasoning);
  const methodId = asText(rca?.method_id) || "brainstorming";
  const isFiveWhys = methodId === "five_whys";
  const rootCauseValue = rca?.root_cause;
  const rootCause = asRecord(rootCauseValue)
    || (typeof rootCauseValue === "string"
      ? { statement: rootCauseValue.trim(), status: asText(rca?.status) || "undetermined" }
      : null);
  const candidateCauses = !isFiveWhys && Array.isArray(rca?.candidate_causes) ? rca.candidate_causes : [];
  const supportingFactIds = asTextArray(rca?.supporting_fact_ids);
  const supportingSectionIds = asTextArray(rca?.supporting_section_ids);
  const evidenceGaps = asTextArray(rca?.evidence_gaps);
  const unsupportedAreas = asTextArray(rca?.unsupported_areas);
  const contradictions = Array.isArray(rca?.contradictions)
    ? rca.contradictions.filter((item): item is Record<string, unknown> => Boolean(asRecord(item)))
    : [];
  const factors = !isFiveWhys ? (mapWorkspaceRcaFactors(workspace) || FACTORS) : [];

  return (
    <div className="space-y-4">
      {!rootCause?.statement ? (
        <div className="rounded-xl border border-dashed border-[rgba(0,0,0,0.12)] bg-white px-5 py-8 text-center" data-testid="rca-empty-state">
          <GitBranch size={18} className="mx-auto text-[#d0d0d8]" />
          <p className="mt-3 text-sm font-semibold text-[#111118]">No RCA content has been generated yet</p>
          <p className="mt-1 text-xs text-[#6b6b7a]">
            A fresh manual case starts blank here. Generate the investigation first, then create RCA from the curated case state.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#f0f0f3] border border-[rgba(0,0,0,0.08)]">
            <GitBranch size={14} className="text-[#c0172d] mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs text-[#6b6b7a] leading-relaxed">
                {isFiveWhys
                  ? `${String(rca?.status || rootCause.status || "undetermined")} Five Whys RCA generated from the current case workspace.`
                  : `${String(rca?.status || rootCause.status || "undetermined")} RCA generated from the current case workspace.`}
              </p>
              {reasoning && (
                <p className="text-xs text-[#111118] leading-relaxed">
                  {reasoning}
                </p>
              )}
            </div>
          </div>

          {isFiveWhys ? (
            rca ? (
              <FiveWhysReview
                rca={rca}
                workspace={workspace}
                rootCause={rootCause}
                supportingFactIds={supportingFactIds}
                supportingSectionIds={supportingSectionIds}
                evidenceGaps={evidenceGaps}
              />
            ) : (
              <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
                Five Whys analysis is unavailable.
              </div>
            )
          ) : (
            <div className="space-y-3">
              {factors.map((f) => {
                const isOpen = open === f.id;
                return (
                  <div key={f.id} className={`rounded-xl border bg-white overflow-hidden transition-all ${isOpen ? "border-[#c0172d]/25" : "border-[rgba(0,0,0,0.09)]"}`}>
                    <button
                      onClick={() => setOpen(isOpen ? 0 : f.id)}
                      className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-[#fafafa] transition-colors"
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${isOpen ? "bg-[#c0172d] text-white" : "bg-[#f0f0f3] text-[#6b6b7a]"}`}>{f.id}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#111118] leading-snug">{f.title}</p>
                        {!isOpen && <p className="text-[11px] text-[#6b6b7a] mt-0.5">{f.evidence.length} evidence items ? {f.cls.type}</p>}
                      </div>
                      {isOpen ? <ChevronUp size={14} className="text-[#6b6b7a] shrink-0 mt-1" /> : <ChevronDown size={14} className="text-[#6b6b7a] shrink-0 mt-1" />}
                    </button>

                    {isOpen && (
                      <div className="border-t border-[rgba(0,0,0,0.06)]">
                        <div className="px-4 py-4">
                          <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2">Supporting Evidence</p>
                          <div className="space-y-1.5">
                            {f.evidence.map((e, i) => (
                              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#f9f9fb] border border-[rgba(0,0,0,0.06)]">
                                <span className="text-[10px] font-bold text-[#c0172d] mt-0.5 shrink-0">E{i + 1}</span>
                                <p className="text-xs text-[#111118] leading-relaxed">{e}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="px-4 pb-4">
                          <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2">Root Cause Narrative</p>
                          <div className="text-sm text-[#111118] leading-relaxed bg-white rounded-xl border border-[rgba(0,0,0,0.08)] px-4 py-3">
                            <p>{f.narrative}</p>
                            {f.whys && f.whys.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.08)]">
                                <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2">5 Whys Chain</p>
                                <ol className="space-y-2">
                                  {f.whys.map((why) => {
                                    const confidence = formatConfidence(why.confidence);
                                    return (
                                      <li key={`${f.id}-${why.whyNumber}`} className="grid grid-cols-[auto_1fr] gap-2">
                                        <span className="w-5 h-5 rounded-full bg-[#fde8eb] text-[#c0172d] text-[10px] font-bold flex items-center justify-center mt-0.5">
                                          {why.whyNumber}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-[#111118] leading-snug">{why.question}</p>
                                          <p className="mt-0.5 text-xs text-[#111118] leading-relaxed">{why.answer}</p>
                                          {(why.outcomeIds.length > 0 || why.evidenceRefs.length > 0 || confidence) && (
                                            <p className="mt-1 text-[10px] text-[#6b6b7a] leading-relaxed">
                                              {why.outcomeIds.length > 0 && <>Outcomes: {why.outcomeIds.join(", ")}</>}
                                              {why.outcomeIds.length > 0 && (why.evidenceRefs.length > 0 || confidence) && <span> ? </span>}
                                              {why.evidenceRefs.length > 0 && <>Evidence: {why.evidenceRefs.join(", ")}</>}
                                              {why.evidenceRefs.length > 0 && confidence && <span> ? </span>}
                                              {confidence && <>Confidence: {confidence}</>}
                                            </p>
                                          )}
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ol>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="px-4 pb-4">
                          <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2">Root Cause Classification</p>
                          <div className="rounded-xl border border-[rgba(0,0,0,0.08)] overflow-hidden">
                            <div className="grid grid-cols-4 bg-[#f4f4f6] border-b border-[rgba(0,0,0,0.07)]">
                              {["Type", "Category", "Level 1", "Level 2"].map((h) => (
                                <div key={h} className="px-3 py-2 text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">{h}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-4">
                              {[f.cls.type, f.cls.category, f.cls.l1, f.cls.l2].map((v, i) => (
                                <div key={i} className="px-3 py-2.5 text-sm font-medium text-[#111118] border-r last:border-r-0 border-[rgba(0,0,0,0.05)]">{v}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="rounded-xl border bg-white overflow-hidden border-[rgba(0,0,0,0.09)]">
                <div className="px-4 py-3.5 border-b border-[rgba(0,0,0,0.06)]">
                  <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2">Root Cause</p>
                  <p className="text-sm font-semibold text-[#111118]" data-testid="rca-root-cause-statement">
                    {String(rootCause.statement || "")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#6b6b7a]">
                    <span className="rounded-full bg-[#f4f4f6] px-2 py-1">Status: {String(rootCause.status || "undetermined")}</span>
                    {rootCause.confidence !== undefined && (
                      <span className="rounded-full bg-[#f4f4f6] px-2 py-1">Confidence: {String(rootCause.confidence)}</span>
                    )}
                    {rca?.human_review_required !== undefined && (
                      <span className="rounded-full bg-[#f4f4f6] px-2 py-1">
                        Human Review: {rca.human_review_required ? "Required" : "Not Required"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 p-4 md:grid-cols-2">
                  <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#fafafa] p-3">
                    <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Supporting Facts</p>
                    <p className="mt-1 text-xs text-[#111118]" data-testid="rca-supporting-facts">
                      {supportingFactIds.length > 0 ? supportingFactIds.join(", ") : "None"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#fafafa] p-3">
                    <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Supporting Sections</p>
                    <p className="mt-1 text-xs text-[#111118]">
                      {supportingSectionIds.length > 0 ? supportingSectionIds.join(", ") : "None"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#fafafa] p-3">
                    <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Evidence Gaps</p>
                    <p className="mt-1 text-xs text-[#111118]">
                      {evidenceGaps.length > 0 ? evidenceGaps.join(" ? ") : "None"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#fafafa] p-3">
                    <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Unsupported Areas</p>
                    <p className="mt-1 text-xs text-[#111118]">
                      {unsupportedAreas.length > 0 ? unsupportedAreas.join(" ? ") : "None"}
                    </p>
                  </div>
                </div>
              </div>

              {candidateCauses.length > 0 && (
                <div className="space-y-2">
                  {candidateCauses.map((candidate, index) => {
                    const candidateRecord = asRecord(candidate);
                    return (
                      <div key={String(candidateRecord?.cause_id || candidateRecord?.statement || index)} className="rounded-xl border bg-white overflow-hidden border-[rgba(0,0,0,0.09)]">
                        <div className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-[#111118]">{String(candidateRecord?.statement || "Candidate cause")}</p>
                          <p className="mt-1 text-[11px] text-[#6b6b7a]">
                            {String(candidateRecord?.support_level || "weakly_supported")} ? {String(candidateRecord?.duplicate_count || 1)}x
                          </p>
                          {asText(candidateRecord?.notes) && (
                            <p className="mt-2 text-xs text-[#111118]">
                              {asText(candidateRecord?.notes)}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#6b6b7a]">
                            <span className="rounded-full bg-[#f4f4f6] px-2 py-1">
                              Facts: {asTextArray(candidateRecord?.supporting_fact_ids).join(", ") || "None"}
                            </span>
                            <span className="rounded-full bg-[#f4f4f6] px-2 py-1">
                              Sections: {asTextArray(candidateRecord?.supporting_section_ids).join(", ") || "None"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {contradictions.length > 0 && (
                <div className="rounded-xl border border-[rgba(0,0,0,0.09)] bg-white p-4">
                  <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2">Contradictions</p>
                  <div className="space-y-2">
                    {contradictions.map((item, index) => (
                      <p key={String(item.fact_id || index)} className="text-xs text-[#111118]">{String(item.detail || item.statement || item.reason || JSON.stringify(item))}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <GenerateCTA label="Generate Historical Review" onGenerate={onComplete}
            note="AUTHOR will search for related historical deviations and recurring patterns." />
        </>
      )}
    </div>
  );
}


// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Stage 7: Risk Assessment Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

type HistoricalReviewDraftState = {
  search_criteria: string;
  date_opened_from: string;
  date_opened_to: string;
  date_closed_from: string;
  date_closed_to: string;
  systems_searched: string;
  records_reviewed: string;
  summary: string;
  impact_on_investigation: string;
  impact_on_rca: string;
  recommendations: string;
};

type HistoricalSearchCriteriaDraftState = {
  objective: string;
  event_summary: string;
  recommended_systems: string[];
  timeframe: {
    start: string;
    end: string;
    rationale: string;
  };
  search_terms: {
    required: string[];
    optional: string[];
    exclude: string[];
  };
  scope: {
    site: string;
    product: string;
    equipment: string;
    process: string;
    department: string;
  };
  rationale: string;
  limitations: string[];
  confidence: "low" | "medium" | "high";
  review_required: boolean;
  source_fact_ids: string[];
  raw_ai_draft: Record<string, unknown> | null;
  prompt_version: string;
  model: string;
  generator_version: string;
  generated_at: string;
};

type HistoricalReviewRecordEvaluationState = {
  record_id: string;
  classification: "related_repeat" | "related_non_repeat" | "not_related" | "unclear_needs_review";
  rationale: string;
  evidence_used: string[];
  confidence: "low" | "medium" | "high";
  review_required: boolean;
  evaluated_at: string;
  model: string;
  prompt_version: string;
};

type HistoricalReviewValidationState = {
  pass: boolean;
  warnings: string[];
  missing_fields: string[];
  recommendations: string[];
  status: "not_started" | "draft" | "completed" | "reviewed";
};

const DEFAULT_HISTORICAL_REVIEW_VALIDATION: HistoricalReviewValidationState = {
  pass: false,
  warnings: [],
  missing_fields: ["search_criteria", "timeframe", "summary"],
  recommendations: [
    "Document the search criteria used to perform the historical review.",
    "Record the timeframe reviewed for the historical search.",
    "Paste the historical review summary into AUTHOR so it can be structured and stored.",
  ],
  status: "not_started",
};

function normalizeHistoricalReviewDraft(review?: HistoricalReview | null): HistoricalReviewDraftState {
  return {
    search_criteria: String(review?.search_criteria || ""),
    date_opened_from: String(review?.date_opened_from || ""),
    date_opened_to: String(review?.date_opened_to || ""),
    date_closed_from: String(review?.date_closed_from || ""),
    date_closed_to: String(review?.date_closed_to || ""),
    systems_searched: (review?.systems_searched || []).join("\n"),
    records_reviewed: review?.records_reviewed === undefined || review?.records_reviewed === null ? "" : String(review.records_reviewed),
    summary: String(review?.summary || ""),
    impact_on_investigation: String(review?.impact_on_investigation || ""),
    impact_on_rca: String(review?.impact_on_rca || ""),
    recommendations: (review?.recommendations || []).join("\n"),
  };
}

function normalizeHistoricalSearchCriteriaDraft(draft?: HistoricalSearchCriteriaDraft | null): HistoricalSearchCriteriaDraftState {
  return {
    objective: String(draft?.objective || ""),
    event_summary: String(draft?.event_summary || ""),
    recommended_systems: draft?.recommended_systems || [],
    timeframe: {
      start: String(draft?.timeframe?.start || ""),
      end: String(draft?.timeframe?.end || ""),
      rationale: String(draft?.timeframe?.rationale || ""),
    },
    search_terms: {
      required: draft?.search_terms?.required || [],
      optional: draft?.search_terms?.optional || [],
      exclude: draft?.search_terms?.exclude || [],
    },
    scope: {
      site: String(draft?.scope?.site || ""),
      product: String(draft?.scope?.product || ""),
      equipment: String(draft?.scope?.equipment || ""),
      process: String(draft?.scope?.process || ""),
      department: String(draft?.scope?.department || ""),
    },
    rationale: String(draft?.rationale || ""),
    limitations: draft?.limitations || [],
    confidence: draft?.confidence || "low",
    review_required: draft?.review_required ?? true,
    source_fact_ids: draft?.source_fact_ids || [],
    raw_ai_draft: draft?.raw_ai_draft || null,
    prompt_version: String(draft?.prompt_version || ""),
    model: String(draft?.model || ""),
    generator_version: String(draft?.generator_version || ""),
    generated_at: String(draft?.generated_at || ""),
  };
}

function buildHistoricalReviewTimeframe(draft: HistoricalReviewDraftState) {
  const ranges = [
    draft.date_opened_from || draft.date_opened_to
      ? `Date opened: ${draft.date_opened_from || "Any"} to ${draft.date_opened_to || "Any"}`
      : null,
    draft.date_closed_from || draft.date_closed_to
      ? `Date closed: ${draft.date_closed_from || "Any"} to ${draft.date_closed_to || "Any"}`
      : null,
  ].filter(Boolean);

  return ranges.join("; ");
}

function buildHistoricalReviewSearchCriteriaSummary(
  searchCriteriaDraft: HistoricalSearchCriteriaDraftState,
) {
  const parts: string[] = [];
  const objective = searchCriteriaDraft.objective.trim();
  const eventSummary = searchCriteriaDraft.event_summary.trim();
  const recommendedSystems = normalizeStringArray(searchCriteriaDraft.recommended_systems);
  const timeframeStart = searchCriteriaDraft.timeframe.start.trim();
  const timeframeEnd = searchCriteriaDraft.timeframe.end.trim();
  const timeframeRationale = searchCriteriaDraft.timeframe.rationale.trim();
  const rationale = searchCriteriaDraft.rationale.trim();

  if (objective) {
    parts.push(`Objective: ${objective}`);
  }
  if (eventSummary) {
    parts.push(`Event summary: ${eventSummary}`);
  }
  if (recommendedSystems.length > 0) {
    parts.push(`Recommended systems: ${recommendedSystems.join(", ")}`);
  }
  if (timeframeStart || timeframeEnd || timeframeRationale) {
    const timeframe = [timeframeStart || "Any", timeframeEnd || "Any"].join(" to ");
    parts.push(`Timeframe: ${timeframe}${timeframeRationale ? ` (${timeframeRationale})` : ""}`);
  }
  if (rationale) {
    parts.push(`Rationale: ${rationale}`);
  }

  return parts.join(" | ") || null;
}

function buildHistoricalReviewSelectionSummary(selectedRecords: HistoricalReviewSearchRecord[]) {
  if (selectedRecords.length === 0) {
    return null;
  }

  const recordIds = selectedRecords
    .map((record) => String(record.pr_id).trim())
    .filter(Boolean);
  const preview = recordIds.slice(0, 4).join(", ");
  const remainder = recordIds.length > 4 ? `, and ${recordIds.length - 4} more` : "";

  return `Reviewed ${selectedRecords.length} saved TrackWise record${selectedRecords.length === 1 ? "" : "s"} (${preview}${remainder}).`;
}

function parseMultilineList(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCommaOrNewlineList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeStringArray(value?: string[] | null) {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const entry of value || []) {
    const text = String(entry || "").trim();
    if (!text) {
      continue;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(text);
  }
  return normalized;
}

function buildHistoricalSearchCriteriaDraftPayload(
  draft: HistoricalSearchCriteriaDraftState,
): HistoricalSearchCriteriaDraft {
  return {
    objective: draft.objective.trim() || null,
    event_summary: draft.event_summary.trim() || null,
    recommended_systems: draft.recommended_systems,
    timeframe: {
      start: draft.timeframe.start.trim() || null,
      end: draft.timeframe.end.trim() || null,
      rationale: draft.timeframe.rationale.trim() || null,
    },
    search_terms: {
      required: draft.search_terms.required,
      optional: draft.search_terms.optional,
      exclude: draft.search_terms.exclude,
    },
    scope: {
      site: draft.scope.site.trim() || null,
      product: draft.scope.product.trim() || null,
      equipment: draft.scope.equipment.trim() || null,
      process: draft.scope.process.trim() || null,
      department: draft.scope.department.trim() || null,
    },
    rationale: draft.rationale.trim() || null,
    limitations: draft.limitations,
    confidence: draft.confidence,
    review_required: true,
    source_fact_ids: draft.source_fact_ids,
    raw_ai_draft: draft.raw_ai_draft || null,
    prompt_version: draft.prompt_version || null,
    model: draft.model || null,
    generator_version: draft.generator_version || null,
    generated_at: draft.generated_at || null,
  };
}

function normalizeHistoricalReviewRecordEvaluation(
  evaluation?: HistoricalReviewRecordEvaluation | null,
): HistoricalReviewRecordEvaluationState {
  return {
    record_id: String(evaluation?.record_id || "").trim(),
    classification:
      evaluation?.classification === "related_repeat"
        || evaluation?.classification === "related_non_repeat"
        || evaluation?.classification === "not_related"
        || evaluation?.classification === "unclear_needs_review"
        ? evaluation.classification
        : "unclear_needs_review",
    rationale: String(evaluation?.rationale || ""),
    evidence_used: normalizeStringArray(evaluation?.evidence_used || null),
    confidence: evaluation?.confidence || "low",
    review_required: evaluation?.review_required ?? true,
    evaluated_at: String(evaluation?.evaluated_at || ""),
    model: String(evaluation?.model || ""),
    prompt_version: String(evaluation?.prompt_version || ""),
  };
}

function buildHistoricalReviewRecordEvaluationPayload(
  evaluation: HistoricalReviewRecordEvaluationState,
): HistoricalReviewRecordEvaluation {
  return {
    record_id: evaluation.record_id.trim(),
    classification: evaluation.classification,
    rationale: evaluation.rationale.trim() || null,
    evidence_used: evaluation.evidence_used,
    confidence: evaluation.confidence,
    review_required: evaluation.review_required,
    evaluated_at: evaluation.evaluated_at.trim() || null,
    model: evaluation.model.trim() || null,
    prompt_version: evaluation.prompt_version.trim() || null,
  };
}

function normalizeHistoricalReviewRecordEvaluations(
  evaluations?: HistoricalReviewRecordEvaluation[] | null,
): HistoricalReviewRecordEvaluationState[] {
  return (evaluations || []).map((evaluation) => normalizeHistoricalReviewRecordEvaluation(evaluation));
}

function filterHistoricalReviewRecordEvaluations(
  evaluations: HistoricalReviewRecordEvaluationState[],
  recordIds: string[],
) {
  const byRecordId = new Map(
    evaluations.map((evaluation) => [evaluation.record_id, evaluation]),
  );

  return recordIds.map((recordId) => byRecordId.get(recordId) || null).filter(
    (item): item is HistoricalReviewRecordEvaluationState => Boolean(item),
  );
}

function hasHistoricalSearchCriteriaDraftContent(draft: HistoricalSearchCriteriaDraftState) {
  return Boolean(
    draft.objective.trim()
    || draft.event_summary.trim()
    || draft.recommended_systems.length
    || draft.timeframe.start.trim()
    || draft.timeframe.end.trim()
    || draft.timeframe.rationale.trim()
    || draft.search_terms.required.length
    || draft.search_terms.optional.length
    || draft.search_terms.exclude.length
    || draft.scope.site.trim()
    || draft.scope.product.trim()
    || draft.scope.equipment.trim()
    || draft.scope.process.trim()
    || draft.scope.department.trim()
    || draft.rationale.trim()
    || draft.limitations.length
    || draft.source_fact_ids.length
    || draft.raw_ai_draft
    || draft.prompt_version.trim()
    || draft.model.trim()
    || draft.generator_version.trim()
    || draft.generated_at.trim()
  );
}

function buildHistoricalReviewPayload(
  draft: HistoricalReviewDraftState,
  existing: HistoricalReview | null | undefined,
  selectedRecords: HistoricalReviewSearchRecord[],
  searchCriteriaDraft: HistoricalSearchCriteriaDraftState,
  recordEvaluations: HistoricalReviewRecordEvaluationState[],
): HistoricalReview {
  const canonicalSearchCriteria = buildHistoricalReviewSearchCriteriaSummary(searchCriteriaDraft)
    || existing?.search_criteria
    || null;
  const canonicalTimeframe = buildHistoricalReviewTimeframe(draft)
    || existing?.timeframe
    || null;
  const canonicalSystemsSearched = searchCriteriaDraft.recommended_systems.length > 0
    ? normalizeStringArray(searchCriteriaDraft.recommended_systems)
    : existing?.systems_searched?.length
      ? normalizeStringArray(existing.systems_searched)
      : selectedRecords.length > 0
        ? ["TrackWise"]
        : [];
  const canonicalRecordsReviewed = selectedRecords.length > 0
    ? selectedRecords.length
    : existing?.records_reviewed ?? null;
  const canonicalSummary = draft.summary.trim()
    || buildHistoricalReviewSelectionSummary(selectedRecords)
    || resolveHistoricalReviewSummary(existing?.summary, selectedRecords)
    || null;

  return {
    source: "TrackWise",
    status: existing?.status || "not_started",
    search_criteria_draft: hasHistoricalSearchCriteriaDraftContent(searchCriteriaDraft)
      ? buildHistoricalSearchCriteriaDraftPayload(searchCriteriaDraft)
      : null,
    record_evaluations: recordEvaluations.map(buildHistoricalReviewRecordEvaluationPayload),
    search_criteria: canonicalSearchCriteria,
    timeframe: canonicalTimeframe,
    date_opened_from: draft.date_opened_from.trim() || existing?.date_opened_from || null,
    date_opened_to: draft.date_opened_to.trim() || existing?.date_opened_to || null,
    date_closed_from: draft.date_closed_from.trim() || existing?.date_closed_from || null,
    date_closed_to: draft.date_closed_to.trim() || existing?.date_closed_to || null,
    systems_searched: canonicalSystemsSearched,
    records_reviewed: canonicalRecordsReviewed,
    similar_events: existing?.similar_events || [],
    summary: canonicalSummary,
    impact_on_investigation: draft.impact_on_investigation.trim() || existing?.impact_on_investigation || null,
    impact_on_risk: existing?.impact_on_risk ?? null,
    impact_on_rca: draft.impact_on_rca.trim() || existing?.impact_on_rca || null,
    recommendations: parseMultilineList(draft.recommendations).length > 0
      ? parseMultilineList(draft.recommendations)
      : existing?.recommendations || [],
    attachments: existing?.attachments || [],
    confidence: existing?.confidence || "low",
    review_notes: existing?.review_notes || [],
    selected_records_ref: existing?.selected_records_ref || null,
    selected_records: selectedRecords.map((record): HistoricalReviewSelectedRecord => ({
      pr_id: String(record.pr_id),
      date_opened: record.date_opened || null,
      date_closed: record.date_closed || null,
      tw_v_initial_criticality: record.tw_v_initial_criticality || null,
      tw_v_site: record.tw_v_site || null,
      tw_v_responsible_department: record.tw_v_responsible_department || null,
      tw_v_dr_type: record.tw_v_dr_type || null,
      detailed_description: record.detailed_description || null,
      investigation: record.investigation || null,
      conclusion: record.conclusion || null,
      record_type: record.record_type || null,
      search_type: record.search_type || null,
      match_reason: record.match_reason || null,
    })),
  };
}

function mapHistoricalReviewOutputRecordToSearchRecord(
  record: NonNullable<HistoricalReview["selected_records_output"]>["records"][number],
): HistoricalReviewSearchRecord {
  return {
    pr_id: record.pr_id,
    date_opened: record.date_opened || null,
    date_closed: record.date_closed || null,
    tw_v_initial_criticality: record.initial_criticality || null,
    tw_v_site: record.site || null,
    tw_v_responsible_department: record.responsible_department || null,
    tw_v_dr_type: record.dr_type || null,
    detailed_description: record.detailed_description || null,
    investigation: record.investigation || null,
    conclusion: record.conclusion || null,
    match_reason: record.match_reason || null,
  };
}

function mergeHistoricalReviewRecords(
  primaryRecords: HistoricalReviewSearchRecord[],
  secondaryRecords: HistoricalReviewSearchRecord[],
) {
  const mergedByPrId = new Map<string, HistoricalReviewSearchRecord>();

  primaryRecords.forEach((record) => {
    mergedByPrId.set(String(record.pr_id), record);
  });
  secondaryRecords.forEach((record) => {
    mergedByPrId.set(String(record.pr_id), record);
  });

  return Array.from(mergedByPrId.values());
}

function normalizeHistoricalReviewValidation(
  validation?: WorkspaceCase["historical_review_validation"] | null,
): HistoricalReviewValidationState {
  if (!validation) {
    return DEFAULT_HISTORICAL_REVIEW_VALIDATION;
  }

  return {
    pass: Boolean(validation.pass),
    warnings: validation.warnings || [],
    missing_fields: validation.missing_fields || [],
    recommendations: validation.recommendations || [],
    status: validation.status || "not_started",
  };
}

function formatHistoricalReviewStatus(status: HistoricalReviewValidationState["status"]) {
  if (status === "reviewed") {
    return "reviewed";
  }
  if (status === "completed") {
    return "completed";
  }
  if (status === "draft") {
    return "draft";
  }
  return "not_started";
}

function historicalReviewStatusCopy(status: HistoricalReviewValidationState["status"]) {
  if (status === "reviewed") {
    return "Reviewed - ready for downstream use";
  }
  if (status === "completed") {
    return "Completed - structurally complete";
  }
  if (status === "draft") {
    return "Draft - content still needs attention";
  }
  return "Not started - no meaningful review content";
}

function formatHistoricalSearchDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

function formatHistoricalReviewClassification(
  value?: HistoricalReviewRecordEvaluationState["classification"] | null,
) {
  switch (value) {
    case "related_repeat":
      return "Related - Repeat";
    case "related_non_repeat":
      return "Related - Non-Repeat";
    case "not_related":
      return "Not Related";
    case "unclear_needs_review":
    default:
      return "Unclear - Needs Review";
  }
}

function joinHistoricalSearchKeywords(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const EMPTY_HISTORICAL_REVIEW_FILTER_OPTIONS: HistoricalReviewFilterOptions = {
  sites: [],
  criticalities: [],
  departments: [],
};

function HistoricalReviewWorkspaceStage({
  workspace,
  caseId,
  refreshWorkspace,
  isBusy,
  setBusy,
  setNotice,
  onComplete,
  registerStageDraftSave,
}: WorkspaceStageProps) {
  const storedReview = workspace?.historical_review || null;
  const currentPrId = String(workspace?.case_intake?.pr_id || "").trim();
  const [draft, setDraft] = useState<HistoricalReviewDraftState>(() => normalizeHistoricalReviewDraft(storedReview));
  const [searchCriteriaDraft, setSearchCriteriaDraft] = useState<HistoricalSearchCriteriaDraftState>(() =>
    normalizeHistoricalSearchCriteriaDraft(storedReview?.search_criteria_draft || null),
  );
  const [searchKeywords, setSearchKeywords] = useState("");
  const [searchSite, setSearchSite] = useState("");
  const [searchCriticality, setSearchCriticality] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  const [filterOptions, setFilterOptions] = useState<HistoricalReviewFilterOptions>(EMPTY_HISTORICAL_REVIEW_FILTER_OPTIONS);
  const [rangeJustification, setRangeJustification] = useState("");
  const [searchResults, setSearchResults] = useState<HistoricalReviewSearchRecord[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [selectedRecordDetailIds, setSelectedRecordDetailIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const visibleSearchResults = useMemo(
    () => filterHistoricalReviewCandidateRecords(searchResults, currentPrId),
    [searchResults, currentPrId],
  );
  const selectedRecords = visibleSearchResults.filter((record) => selectedRecordIds.includes(String(record.pr_id)));
  const hydratedSelectedRecords = useMemo<HistoricalReviewSearchRecord[]>(
    () => filterHistoricalReviewCandidateRecords(
      (storedReview?.selected_records_output?.records || []).map(mapHistoricalReviewOutputRecordToSearchRecord),
      currentPrId,
    ),
    [storedReview?.selected_records_output?.records, currentPrId],
  );
  const persistedRecordEvaluations = useMemo(
    () => normalizeHistoricalReviewRecordEvaluations(storedReview?.record_evaluations || null),
    [storedReview?.record_evaluations],
  );
  const persistedRecordEvaluationsById = useMemo(() => new Map(
    persistedRecordEvaluations.map((evaluation) => [evaluation.record_id, evaluation]),
  ), [persistedRecordEvaluations]);
  const [savedSelectedRecordsState, setSavedSelectedRecordsState] = useState<HistoricalReviewSearchRecord[]>(hydratedSelectedRecords);
  const displayedSelectedRecords = useMemo(
    () => mergeHistoricalReviewRecords(savedSelectedRecordsState, selectedRecords),
    [savedSelectedRecordsState, selectedRecords],
  );
  const detailedSelectedRecords = displayedSelectedRecords.filter((record) => selectedRecordDetailIds.includes(String(record.pr_id)));
  const allVisibleSelected = visibleSearchResults.length > 0 && visibleSearchResults.every((record) => selectedRecordIds.includes(String(record.pr_id)));
  const someVisibleSelected = visibleSearchResults.some((record) => selectedRecordIds.includes(String(record.pr_id)));

  const applyHistoricalSearchPage = (
    page: Awaited<ReturnType<typeof searchHistoricalReviews>>,
    fallbackPage: number,
    selectFirstRecord: boolean,
  ) => {
    const records = page.records || [];
    setSearchResults(records);
    setSearchTotal(page.total || 0);
    setSearchTotalPages(page.total_pages || 0);
    setSearchPage(page.page || fallbackPage);
    const selectableRecords = filterHistoricalReviewCandidateRecords(records, currentPrId);
    setSelectedRecordIds(selectFirstRecord && selectableRecords.length > 0 ? [String(selectableRecords[0].pr_id)] : []);
  };

  useEffect(() => {
    setDraft(normalizeHistoricalReviewDraft(storedReview));
    setSearchCriteriaDraft(normalizeHistoricalSearchCriteriaDraft(storedReview?.search_criteria_draft || null));
  }, [
    caseId,
    storedReview?.search_criteria_draft,
    storedReview?.record_evaluations,
    storedReview?.search_criteria,
    storedReview?.timeframe,
    storedReview?.date_opened_from,
    storedReview?.date_opened_to,
    storedReview?.date_closed_from,
    storedReview?.date_closed_to,
    storedReview?.systems_searched,
    storedReview?.records_reviewed,
    storedReview?.summary,
    storedReview?.impact_on_investigation,
    storedReview?.impact_on_rca,
    storedReview?.recommendations,
  ]);

  useEffect(() => {
    setSavedSelectedRecordsState(hydratedSelectedRecords);
  }, [hydratedSelectedRecords]);

  useEffect(() => {
    let isCurrent = true;

    void loadHistoricalReviewFilterOptions()
      .then((options) => {
        if (isCurrent) {
          setFilterOptions(options);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setFilterOptions(EMPTY_HISTORICAL_REVIEW_FILTER_OPTIONS);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const initialDraft = normalizeHistoricalReviewDraft(storedReview);
    const hasPersistedSearchCriteria = Boolean(
      initialDraft.date_opened_from ||
      initialDraft.date_opened_to ||
      initialDraft.date_closed_from ||
      initialDraft.date_closed_to ||
      initialDraft.search_criteria.trim() ||
      initialDraft.systems_searched.trim(),
    );

    if (!hasPersistedSearchCriteria) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearchTotalPages(0);
      setSearchPage(1);
      setSelectedRecordIds([]);
      return () => {
        isCurrent = false;
      };
    }

    setIsSearching(true);

    void searchHistoricalReviews({
      date_opened_from: initialDraft.date_opened_from || null,
      date_opened_to: initialDraft.date_opened_to || null,
      date_closed_from: initialDraft.date_closed_from || null,
      date_closed_to: initialDraft.date_closed_to || null,
      page: 1,
      page_size: 10,
    })
      .then((page) => {
        if (!isCurrent) {
          return;
        }
        applyHistoricalSearchPage(page, 1, true);
      })
      .catch(() => {
        if (!isCurrent) {
          return;
        }
        setSearchResults([]);
        setSearchTotal(0);
        setSearchTotalPages(0);
        setSearchPage(1);
        setSelectedRecordIds([]);
      })
      .finally(() => {
        if (isCurrent) {
          setIsSearching(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    caseId,
    storedReview?.date_opened_from,
    storedReview?.date_opened_to,
    storedReview?.date_closed_from,
    storedReview?.date_closed_to,
  ]);

  useEffect(() => {
    if (visibleSearchResults.length === 0 || selectedRecordIds.length > 0 || savedSelectedRecordsState.length === 0) {
      return;
    }
    const savedIds = new Set(savedSelectedRecordsState.map((record) => String(record.pr_id)));
    const matchingIds = visibleSearchResults
      .map((record) => String(record.pr_id))
      .filter((recordId) => savedIds.has(recordId));
    if (matchingIds.length > 0) {
      setSelectedRecordIds(matchingIds);
    }
  }, [savedSelectedRecordsState, visibleSearchResults, selectedRecordIds.length]);

  useEffect(() => {
    const visibleIds = new Set(displayedSelectedRecords.map((record) => String(record.pr_id)));
    setSelectedRecordDetailIds((current) => current.filter((recordId) => visibleIds.has(recordId)));
  }, [displayedSelectedRecords]);

  const validationSummary = normalizeHistoricalReviewValidation(workspace?.historical_review_validation);
  const currentStatus = formatHistoricalReviewStatus(validationSummary.status);
  const acceptedFactCount = (workspace?.facts.accepted || []).length;

  const updateField = (field: keyof HistoricalReviewDraftState, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const updateCriteriaField = <K extends keyof HistoricalSearchCriteriaDraftState>(
    field: K,
    value: HistoricalSearchCriteriaDraftState[K],
  ) => {
    setSearchCriteriaDraft((current) => ({ ...current, [field]: value }));
  };

  const updateCriteriaListField = (
    field: "recommended_systems" | "limitations" | "source_fact_ids",
    value: string,
  ) => {
    updateCriteriaField(field, parseMultilineList(value) as HistoricalSearchCriteriaDraftState[typeof field]);
  };

  const updateCriteriaTermsField = (
    field: "required" | "optional" | "exclude",
    value: string,
  ) => {
    setSearchCriteriaDraft((current) => ({
      ...current,
      search_terms: {
        ...current.search_terms,
        [field]: parseCommaOrNewlineList(value),
      },
    }));
  };

  const generateSearchCriteriaDraft = async () => {
    if (!caseId || isBusy || acceptedFactCount === 0) {
      return;
    }

    setBusy(true);
    try {
      const response = await generateHistoricalReviewSearchCriteria(caseId);
      const generatedDraft = normalizeHistoricalSearchCriteriaDraft(response.search_criteria_draft);
      setSearchCriteriaDraft(generatedDraft);
      await updateHistoricalReview(
        caseId,
        buildHistoricalReviewPayload(
          draft,
          storedReview,
          displayedSelectedRecords,
          generatedDraft,
          filterHistoricalReviewRecordEvaluations(
            persistedRecordEvaluations,
            displayedSelectedRecords.map((record) => String(record.pr_id)),
          ),
        ),
      );
      await refreshWorkspace(caseId);
      setNotice({
        kind: "success",
        message: "Historical search criteria draft generated.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to generate historical search criteria.",
      });
    } finally {
      setBusy(false);
    }
  };

  const runHistoricalReviewRecordEvaluation = async () => {
    if (!caseId || isBusy || savedSelectedRecordsState.length === 0) {
      return;
    }

    setBusy(true);
    try {
      await evaluateHistoricalReviewRecords(caseId);
      await refreshWorkspace(caseId);
      setNotice({
        kind: "success",
        message: "Historical review record evaluations generated.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to evaluate historical review records.",
      });
    } finally {
      setBusy(false);
    }
  };

  const runHistoricalSearch = async (nextPage = 1) => {
    if (isSearching) {
      return;
    }
    if (!rangeJustification.trim()) {
      setNotice({
        kind: "error",
        message: "Range justification is required before searching historical records.",
      });
      return;
    }

    setIsSearching(true);
    try {
      const page = await searchHistoricalReviews({
        date_opened_from: draft.date_opened_from || null,
        date_opened_to: draft.date_opened_to || null,
        date_closed_from: draft.date_closed_from || null,
        date_closed_to: draft.date_closed_to || null,
        keywords: joinHistoricalSearchKeywords(searchKeywords),
        site: searchSite || null,
        initial_criticality: searchCriticality || null,
        responsible_department: searchDepartment || null,
        page: nextPage,
        page_size: 10,
      });
      applyHistoricalSearchPage(page, nextPage, false);
      setSearchResults(page.records || []);
      setSearchTotal(page.total || 0);
      setSearchTotalPages(page.total_pages || 0);
      setSearchPage(page.page || nextPage);
      setSelectedRecordIds([]);
      setNotice({
        kind: "success",
        message: `Historical search returned ${page.total || 0} record${page.total === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to search historical records.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const persistReview = async ({ advanceStage }: { advanceStage: boolean }) => {
    if (!caseId || isBusy) {
      return;
    }

    setBusy(true);
    try {
      const payload = buildHistoricalReviewPayload(
        draft,
        storedReview,
        displayedSelectedRecords,
        searchCriteriaDraft,
        filterHistoricalReviewRecordEvaluations(
          persistedRecordEvaluations,
          displayedSelectedRecords.map((record) => String(record.pr_id)),
        ),
      );
      const nextWorkspace = await updateHistoricalReview(caseId, payload);
      setSavedSelectedRecordsState(
        filterHistoricalReviewCandidateRecords(
          (nextWorkspace.historical_review?.selected_records_output?.records || []).map(mapHistoricalReviewOutputRecordToSearchRecord),
          currentPrId,
        ),
      );
      setDraft(normalizeHistoricalReviewDraft(nextWorkspace.historical_review || payload));
      await refreshWorkspace(caseId);
      const nextValidation = normalizeHistoricalReviewValidation(nextWorkspace.historical_review_validation || workspace?.historical_review_validation);
      setNotice({
        kind: nextValidation.pass ? "success" : "info",
        message: nextValidation.pass ? "Historical Review saved." : "Historical Review saved with validation warnings.",
      });
      if (advanceStage) {
        onComplete();
      }
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to save Historical Review.",
      });
    } finally {
      setBusy(false);
    }
  };

  const saveReview = async () => {
    await persistReview({ advanceStage: true });
  };

  const saveReviewDraft = async () => {
    await persistReview({ advanceStage: false });
  };

  useEffect(() => {
    if (!registerStageDraftSave) {
      return;
    }
    registerStageDraftSave(() => saveReviewDraft);
    return () => {
      registerStageDraftSave(null);
    };
  }, [registerStageDraftSave, saveReviewDraft]);

  const toggleRecordSelection = (recordId: string, checked: boolean) => {
    setSelectedRecordIds((current) => {
      if (checked) {
        return current.includes(recordId) ? current : [...current, recordId];
      }
      return current.filter((id) => id !== recordId);
    });
  };

  const toggleVisibleSelection = (checked: boolean) => {
    const visibleRecordIds = visibleSearchResults.map((record) => String(record.pr_id));
    setSelectedRecordIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...visibleRecordIds]));
      }
      return current.filter((id) => !visibleRecordIds.includes(id));
    });
  };

  const toggleRecordByClick = (recordId: string) => {
    setSelectedRecordIds((current) => (
      current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId]
    ));
  };

  const toggleSelectedRecordDetail = (recordId: string, checked: boolean) => {
    setSelectedRecordDetailIds((current) => (
      checked
        ? (current.includes(recordId) ? current : [...current, recordId])
        : current.filter((id) => id !== recordId)
    ));
  };

  const toggleSelectedRecordDetailByClick = (recordId: string) => {
    setSelectedRecordDetailIds((current) => (
      current.includes(recordId)
        ? current.filter((id) => id !== recordId)
        : [...current, recordId]
    ));
  };

  const deleteSelectedRecords = () => {
    if (selectedRecordDetailIds.length === 0) {
      return;
    }
    const deletedIds = new Set(selectedRecordDetailIds);
    setSavedSelectedRecordsState((current) => current.filter((record) => !deletedIds.has(String(record.pr_id))));
    setSelectedRecordIds((current) => current.filter((id) => !deletedIds.has(id)));
    setSelectedRecordDetailIds([]);
  };

  return (
    <div className="space-y-4" data-testid="historical-review-section">
      <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden" data-testid="historical-search-criteria-draft">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,0,0,0.05)]">
          <Search size={13} className="text-[#6b6b7a]" />
          <span className="text-sm font-semibold text-[#111118] flex-1">Search Criteria Draft</span>
          <button
            type="button"
            onClick={() => void generateSearchCriteriaDraft()}
            disabled={isBusy || acceptedFactCount === 0}
            className="rounded-lg bg-[#c0172d] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#a8142a] disabled:cursor-not-allowed disabled:bg-[#e8e8ec] disabled:text-[#b0b0bc]"
          >
            Generate Search Criteria Draft
          </button>
        </div>
        <div className="space-y-4 px-4 py-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <AutoGrowEditField
              label="Objective"
              value={searchCriteriaDraft.objective || ""}
              rows={2}
              onChange={(value) => updateCriteriaField("objective", value)}
            />
            <AutoGrowEditField
              label="Event Summary"
              value={searchCriteriaDraft.event_summary || ""}
              rows={2}
              onChange={(value) => updateCriteriaField("event_summary", value)}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <AutoGrowEditField
              label="Recommended Systems"
              value={searchCriteriaDraft.recommended_systems.join("\n")}
              rows={2}
              onChange={(value) => updateCriteriaListField("recommended_systems", value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Timeframe Start</label>
                <input
                  value={searchCriteriaDraft.timeframe.start || ""}
                  onChange={(event) => updateCriteriaField("timeframe", { ...searchCriteriaDraft.timeframe, start: event.target.value })}
                  className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] px-3 py-2 text-sm text-[#111118] focus:border-[#c0172d] focus:outline-none focus:ring-1 focus:ring-[#c0172d]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Timeframe End</label>
                <input
                  value={searchCriteriaDraft.timeframe.end || ""}
                  onChange={(event) => updateCriteriaField("timeframe", { ...searchCriteriaDraft.timeframe, end: event.target.value })}
                  className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] px-3 py-2 text-sm text-[#111118] focus:border-[#c0172d] focus:outline-none focus:ring-1 focus:ring-[#c0172d]"
                />
              </div>
              <div className="sm:col-span-2">
                <AutoGrowEditField
                  label="Timeframe Rationale"
                  value={searchCriteriaDraft.timeframe.rationale || ""}
                  rows={2}
                  onChange={(value) => updateCriteriaField("timeframe", { ...searchCriteriaDraft.timeframe, rationale: value })}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <AutoGrowEditField
              label="Required Search Terms"
              value={searchCriteriaDraft.search_terms.required.join("\n")}
              rows={2}
              onChange={(value) => updateCriteriaTermsField("required", value)}
            />
            <AutoGrowEditField
              label="Optional Search Terms"
              value={searchCriteriaDraft.search_terms.optional.join("\n")}
              rows={2}
              onChange={(value) => updateCriteriaTermsField("optional", value)}
            />
            <AutoGrowEditField
              label="Exclude Terms"
              value={searchCriteriaDraft.search_terms.exclude.join("\n")}
              rows={2}
              onChange={(value) => updateCriteriaTermsField("exclude", value)}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Site</label>
              <input
                value={searchCriteriaDraft.scope.site || ""}
                onChange={(event) => updateCriteriaField("scope", { ...searchCriteriaDraft.scope, site: event.target.value })}
                className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] px-3 py-2 text-sm text-[#111118] focus:border-[#c0172d] focus:outline-none focus:ring-1 focus:ring-[#c0172d]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Product</label>
              <input
                value={searchCriteriaDraft.scope.product || ""}
                onChange={(event) => updateCriteriaField("scope", { ...searchCriteriaDraft.scope, product: event.target.value })}
                className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] px-3 py-2 text-sm text-[#111118] focus:border-[#c0172d] focus:outline-none focus:ring-1 focus:ring-[#c0172d]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Equipment</label>
              <input
                value={searchCriteriaDraft.scope.equipment || ""}
                onChange={(event) => updateCriteriaField("scope", { ...searchCriteriaDraft.scope, equipment: event.target.value })}
                className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] px-3 py-2 text-sm text-[#111118] focus:border-[#c0172d] focus:outline-none focus:ring-1 focus:ring-[#c0172d]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Process</label>
              <input
                value={searchCriteriaDraft.scope.process || ""}
                onChange={(event) => updateCriteriaField("scope", { ...searchCriteriaDraft.scope, process: event.target.value })}
                className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] px-3 py-2 text-sm text-[#111118] focus:border-[#c0172d] focus:outline-none focus:ring-1 focus:ring-[#c0172d]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Department</label>
              <input
                value={searchCriteriaDraft.scope.department || ""}
                onChange={(event) => updateCriteriaField("scope", { ...searchCriteriaDraft.scope, department: event.target.value })}
                className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] px-3 py-2 text-sm text-[#111118] focus:border-[#c0172d] focus:outline-none focus:ring-1 focus:ring-[#c0172d]"
              />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <AutoGrowEditField
              label="Rationale"
              value={searchCriteriaDraft.rationale || ""}
              rows={2}
              onChange={(value) => updateCriteriaField("rationale", value)}
            />
            <AutoGrowEditField
              label="Limitations"
              value={searchCriteriaDraft.limitations.join("\n")}
              rows={2}
              onChange={(value) => updateCriteriaListField("limitations", value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Confidence</label>
              <select
                value={searchCriteriaDraft.confidence || "low"}
                onChange={(event) => updateCriteriaField("confidence", event.target.value as HistoricalSearchCriteriaDraftState["confidence"])}
                className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] px-3 py-2 text-sm text-[#111118] focus:border-[#c0172d] focus:outline-none focus:ring-1 focus:ring-[#c0172d]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] px-3 py-2 text-sm text-[#111118]">
              <input
                type="checkbox"
                checked={Boolean(searchCriteriaDraft.review_required)}
                onChange={(event) => updateCriteriaField("review_required", event.target.checked)}
                className="h-4 w-4 rounded border-[rgba(0,0,0,0.2)] text-[#c0172d] focus:ring-[#c0172d]"
              />
              Review required
            </label>
            <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] px-3 py-2 text-xs text-[#6b6b7a]">
              <p className="font-semibold uppercase tracking-wider">Traceability</p>
              <p className="mt-1">Prompt {searchCriteriaDraft.prompt_version || "n/a"} · Model {searchCriteriaDraft.model || "n/a"} · {searchCriteriaDraft.generated_at ? new Date(searchCriteriaDraft.generated_at).toLocaleString() : "Not generated yet"}</p>
              <p className="mt-1">Accepted facts: {searchCriteriaDraft.source_fact_ids?.length || 0}</p>
            </div>
          </div>

          <details className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-[#6b6b7a]">Raw Draft</summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-[#111118]">
              {JSON.stringify(searchCriteriaDraft.raw_ai_draft || {}, null, 2)}
            </pre>
          </details>
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,0,0,0.05)]">
          <Search size={13} className="text-[#6b6b7a]" />
          <span className="text-sm font-semibold text-[#111118] flex-1">Historical Review</span>
          <span className="text-[11px] text-[#6b6b7a]">Search TrackWise, review records, then capture the authored summary.</span>
        </div>
        <div className="border-b border-[rgba(0,0,0,0.05)] px-4 py-4">
          <div className="space-y-3">
            <div className="flex min-w-0 flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Keywords</label>
              <input
                value={searchKeywords}
                onChange={(event) => setSearchKeywords(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void runHistoricalSearch(1);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] text-sm text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
                placeholder="comma separated terms"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-3">
                <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Date Opened Range</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">From</label>
                    <input
                      type="date"
                      value={draft.date_opened_from}
                      onChange={(event) => updateField("date_opened_from", event.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">To</label>
                    <input
                      type="date"
                      value={draft.date_opened_to}
                      onChange={(event) => updateField("date_opened_to", event.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-3">
                <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Date Closed Range</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">From</label>
                    <input
                      type="date"
                      value={draft.date_closed_from}
                      onChange={(event) => updateField("date_closed_from", event.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">To</label>
                    <input
                      type="date"
                      value={draft.date_closed_to}
                      onChange={(event) => updateField("date_closed_to", event.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white text-sm text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Range Justification <span className="text-[#c0172d]">*</span></label>
              <textarea
                value={rangeJustification}
                onChange={(event) => setRangeJustification(event.target.value)}
                rows={2}
                className="w-full resize-none px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] text-sm text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
                placeholder="Explain why this historical date range is appropriate"
                required
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="flex min-w-0 flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Site</label>
                <input
                  value={searchSite}
                  onChange={(event) => setSearchSite(event.target.value)}
                  list="historical-review-site-options"
                  className="w-full px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] text-xs text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
                  placeholder="Search or select a site"
                />
                <datalist id="historical-review-site-options">
                  {filterOptions.sites.map((site) => <option key={site} value={site} />)}
                </datalist>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Criticality</label>
                <input
                  value={searchCriticality}
                  onChange={(event) => setSearchCriticality(event.target.value)}
                  list="historical-review-criticality-options"
                  className="w-full px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] text-xs text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
                  placeholder="Search or select criticality"
                />
                <datalist id="historical-review-criticality-options">
                  {filterOptions.criticalities.map((criticality) => <option key={criticality} value={criticality} />)}
                </datalist>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">Department</label>
                <input
                  value={searchDepartment}
                  onChange={(event) => setSearchDepartment(event.target.value)}
                  list="historical-review-department-options"
                  className="w-full px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] text-xs text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
                  placeholder="Search or select a department"
                />
                <datalist id="historical-review-department-options">
                  {filterOptions.departments.map((department) => <option key={department} value={department} />)}
                </datalist>
              </div>
              <button
                type="button"
                onClick={() => void runHistoricalSearch(1)}
                disabled={isSearching}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#c0172d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#a8142a] disabled:cursor-not-allowed disabled:opacity-60 lg:mt-5"
              >
                {isSearching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-[rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.05)] bg-[#f9f9fb] px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Search Results</p>
              <p className="text-[11px] font-medium text-[#6b6b7a]">
                {searchTotal} total {selectedRecordIds.length > 0 ? `• ${selectedRecordIds.length} selected` : ""}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[rgba(0,0,0,0.06)] text-left">
                <thead className="bg-white">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        ref={(node) => {
                          if (node) {
                            node.indeterminate = !allVisibleSelected && someVisibleSelected;
                          }
                        }}
                        onChange={(event) => toggleVisibleSelection(event.target.checked)}
                        aria-label="Select all visible historical review records"
                        data-testid="historical-review-select-all-checkbox"
                        className="h-4 w-4 rounded border-[rgba(0,0,0,0.2)] text-[#c0172d] focus:ring-[#c0172d]"
                      />
                    </th>
                    {["PR ID", "Opened", "Closed", "Site", "Criticality", "Department", "DR Type", "Match"].map((heading) => (
                      <th key={heading} className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(0,0,0,0.05)] bg-white">
                  {visibleSearchResults.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-sm text-[#6b6b7a]">
                        Run a search to show historical records.
                      </td>
                    </tr>
                  ) : visibleSearchResults.map((record) => {
                    const recordId = String(record.pr_id);
                    const isSelected = selectedRecordIds.includes(recordId);
                    return (
                      <tr
                        key={recordId}
                        onClick={() => toggleRecordByClick(recordId)}
                        className={`cursor-pointer transition-colors ${isSelected ? "bg-rose-50" : "hover:bg-[#f9f9fb]"}`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => toggleRecordSelection(recordId, event.target.checked)}
                            aria-label={`Select historical review record ${record.pr_id}`}
                            data-testid={`historical-review-record-checkbox-${recordId}`}
                            className="h-4 w-4 rounded border-[rgba(0,0,0,0.2)] text-[#c0172d] focus:ring-[#c0172d]"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm font-semibold text-[#111118]">{record.pr_id}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-[#4b4b57]">{formatHistoricalSearchDate(record.date_opened)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-[#4b4b57]">{formatHistoricalSearchDate(record.date_closed)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-[#4b4b57]">{record.tw_v_site || "-"}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-[#4b4b57]">{record.tw_v_initial_criticality || "-"}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-[#4b4b57]">{record.tw_v_responsible_department || "-"}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-[#4b4b57]">{record.tw_v_dr_type || "-"}</td>
                        <td className="min-w-[220px] px-3 py-2 text-sm text-[#4b4b57]">{record.match_reason || record.search_type || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {searchTotalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(0,0,0,0.05)] bg-[#f9f9fb] px-3 py-2">
                <p className="text-[11px] font-medium text-[#6b6b7a]">
                  Page {searchPage} of {searchTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void runHistoricalSearch(searchPage - 1)}
                    disabled={isSearching || searchPage <= 1}
                    className="flex h-8 items-center gap-1 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-3 text-xs font-semibold text-[#111118] transition-colors hover:bg-[#f4f4f6] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft size={13} />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => void runHistoricalSearch(searchPage + 1)}
                    disabled={isSearching || searchPage >= searchTotalPages}
                    className="flex h-8 items-center gap-1 rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-3 text-xs font-semibold text-[#111118] transition-colors hover:bg-[#f4f4f6] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
          {displayedSelectedRecords.length > 0 && (
            <div className="mt-4 rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#111118]">
                  Saved Selected Records ({displayedSelectedRecords.length})
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void runHistoricalReviewRecordEvaluation()}
                    disabled={isBusy || savedSelectedRecordsState.length === 0}
                    className="rounded-lg border border-[rgba(192,23,45,0.16)] bg-white px-3 py-1.5 text-xs font-semibold text-[#c0172d] transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Evaluate Saved Records
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedRecords}
                    disabled={selectedRecordDetailIds.length === 0}
                    className="rounded-lg border border-[rgba(192,23,45,0.16)] bg-white px-3 py-1.5 text-xs font-semibold text-[#c0172d] transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRecordIds([]);
                      setSelectedRecordDetailIds([]);
                    }}
                    className="rounded-lg p-1.5 text-[#6b6b7a] transition-colors hover:bg-white hover:text-[#111118]"
                    aria-label="Clear selected historical records"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="mt-3 overflow-hidden rounded-lg border border-[rgba(0,0,0,0.08)]">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[rgba(0,0,0,0.06)] text-left">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]"></th>
                        {["PR ID", "Opened", "Closed", "Site", "Criticality", "Department", "DR Type", "Match"].map((heading) => (
                          <th key={heading} className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(0,0,0,0.05)] bg-white">
                      {displayedSelectedRecords.map((record) => {
                        const recordId = String(record.pr_id);
                        const isChecked = selectedRecordDetailIds.includes(recordId);
                        return (
                          <tr
                            key={recordId}
                            onClick={() => toggleSelectedRecordDetailByClick(recordId)}
                            className={`cursor-pointer transition-colors ${isChecked ? "bg-rose-50" : "hover:bg-[#f9f9fb]"}`}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => toggleSelectedRecordDetail(recordId, event.target.checked)}
                                aria-label={`Select saved historical review record ${record.pr_id} for details`}
                                className="h-4 w-4 rounded border-[rgba(0,0,0,0.2)] text-[#c0172d] focus:ring-[#c0172d]"
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-sm font-semibold text-[#111118]">{record.pr_id}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-sm text-[#4b4b57]">{formatHistoricalSearchDate(record.date_opened)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-sm text-[#4b4b57]">{formatHistoricalSearchDate(record.date_closed)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-sm text-[#4b4b57]">{record.tw_v_site || "-"}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-sm text-[#4b4b57]">{record.tw_v_initial_criticality || "-"}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-sm text-[#4b4b57]">{record.tw_v_responsible_department || "-"}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-sm text-[#4b4b57]">{record.tw_v_dr_type || "-"}</td>
                            <td className="min-w-[220px] px-3 py-2 text-sm text-[#4b4b57]">{record.match_reason || record.search_type || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {detailedSelectedRecords.length > 0 && (
                <div className="mt-3 space-y-3">
                  {detailedSelectedRecords.map((record) => (
                    <div key={String(record.pr_id)} className="rounded-lg border border-[rgba(0,0,0,0.06)] bg-white p-3">
                      <div className="flex items-center justify-between gap-3 border-b border-[rgba(0,0,0,0.06)] pb-3">
                        <div>
                          <p className="text-sm font-semibold text-[#111118]">{record.pr_id}</p>
                          <p className="mt-1 text-xs text-[#6b6b7a]">
                            {record.tw_v_site || "Unknown site"} • {record.tw_v_responsible_department || "Unknown department"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const recordId = String(record.pr_id);
                            setSavedSelectedRecordsState((current) => current.filter((item) => String(item.pr_id) !== recordId));
                            setSelectedRecordIds((current) => current.filter((id) => id !== recordId));
                            setSelectedRecordDetailIds((current) => current.filter((id) => id !== recordId));
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-[#6b6b7a] transition-colors hover:bg-[#f4f4f6] hover:text-[#111118]"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-3">
                        {[
                          ["Detailed Description", record.detailed_description],
                          ["Investigation", record.investigation],
                          ["Conclusion", record.conclusion],
                        ].map(([label, value]) => (
                          <div key={`${record.pr_id}-${label}`} className="rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#f9f9fb] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">{label}</p>
                            <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-[#111118]">
                              {value || "-"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="mt-4 rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-4" data-testid="historical-review-record-evaluations-section">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#111118]">Related / Repeat Evaluation</p>
                <p className="mt-1 text-xs text-[#6b6b7a]">
                  Persisted classifications, rationales, and traceability for saved historical review records.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void runHistoricalReviewRecordEvaluation()}
                disabled={isBusy || savedSelectedRecordsState.length === 0}
                className="rounded-lg border border-[rgba(192,23,45,0.16)] bg-white px-3 py-1.5 text-xs font-semibold text-[#c0172d] transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Evaluate Saved Records
              </button>
            </div>
            {savedSelectedRecordsState.length === 0 ? (
              <div
                className="mt-3 rounded-lg border border-dashed border-[rgba(0,0,0,0.12)] bg-white px-4 py-5 text-sm text-[#6b6b7a]"
                data-testid="historical-review-record-evaluations-empty-state"
              >
                No saved historical review records are available yet. Select and save historical review records to review their evaluations here.
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {savedSelectedRecordsState.map((record) => {
                  const recordId = String(record.pr_id);
                  const evaluation = persistedRecordEvaluationsById.get(recordId);
                  return (
                    <div
                      key={recordId}
                      className="rounded-lg border border-[rgba(0,0,0,0.06)] bg-white p-3"
                      data-testid={`historical-review-record-evaluation-card-${recordId}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(0,0,0,0.06)] pb-3">
                        <div>
                          <p className="text-sm font-semibold text-[#111118]">{record.pr_id}</p>
                          <p className="mt-1 text-xs text-[#6b6b7a]">
                            {record.tw_v_site || "Unknown site"} • {record.tw_v_responsible_department || "Unknown department"}
                          </p>
                        </div>
                        {evaluation ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] px-2.5 py-1 text-[11px] font-semibold text-[#111118]">
                              {formatHistoricalReviewClassification(evaluation.classification)}
                            </span>
                            <span className="rounded-full border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] px-2.5 py-1 text-[11px] text-[#6b6b7a]">
                              Confidence: {evaluation.confidence || "low"}
                            </span>
                            <span className="rounded-full border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] px-2.5 py-1 text-[11px] text-[#6b6b7a]">
                              Review required: {evaluation.review_required ? "Yes" : "No"}
                            </span>
                          </div>
                        ) : (
                          <span className="rounded-full border border-dashed border-[rgba(0,0,0,0.12)] bg-[#f9f9fb] px-2.5 py-1 text-[11px] text-[#6b6b7a]">
                            No evaluation yet
                          </span>
                        )}
                      </div>
                      {evaluation ? (
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Rationale</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#111118]">
                              {evaluation.rationale || "No rationale provided yet."}
                            </p>
                          </div>
                          <div className="grid gap-3">
                            <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Evidence Used</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(evaluation.evidence_used.length > 0 ? evaluation.evidence_used : ["No evidence noted yet."]).map((item, index) => (
                                  <span
                                    key={`${recordId}-evidence-${index}`}
                                    className="rounded-full bg-white px-2.5 py-1 text-[11px] text-[#111118]"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-3 text-xs text-[#6b6b7a]">
                              <p className="font-semibold uppercase tracking-wider">Traceability</p>
                              <p className="mt-1">Model {evaluation.model || "n/a"} · Prompt {evaluation.prompt_version || "n/a"}</p>
                              <p className="mt-1">Evaluated {evaluation.evaluated_at ? new Date(evaluation.evaluated_at).toLocaleString() : "n/a"}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="mt-3 rounded-lg border border-dashed border-[rgba(0,0,0,0.12)] bg-[#f9f9fb] p-4 text-sm text-[#6b6b7a]"
                          data-testid={`historical-review-record-evaluation-empty-${recordId}`}
                        >
                          No evaluation has been generated for this record yet. Use Evaluate Saved Records to populate classification, rationale, confidence, and traceability.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
        <p className="text-[10px] text-[#6b6b7a] flex items-center gap-1">
          <Info size={10} />
          Historical Review saves only the checked records so downstream stages can read the JSON output.
        </p>
        <button
          onClick={() => void saveReview()}
          disabled={isBusy}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#c0172d] text-white hover:bg-[#a8142a] shadow-sm transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed
          "
        >
          <Save size={14} />
          Save and Continue
        </button>
      </div>
    </div>
  );
}

const REMED_SECS = [
  {
    title: "Immediate Corrections", summary: "Quarantine complete Ã‚Â· Line 3 cleared", defaultOpen: true,
    items: [
      { id: "r1", text: "Quarantine ~1,200 units of BN3238646 under QP-GEN-0012", done: true },
      { id: "r2", text: "Line 3 (PKG-LINE-003) inspection completed Ã¢â‚¬â€ no equipment defects found", done: true },
      { id: "r3", text: "Full label stock reconciliation for BN3238646 and BN3238631 completed", done: true },
      { id: "r4", text: "Relabeling assessment for quarantined units Ã¢â‚¬â€ in progress", done: false },
    ]
  },
  {
    title: "CAPA Plan", summary: "3 actions Ã‚Â· Due 30 Jul 2026", defaultOpen: true,
    items: [
      { id: "c1", text: "Revise SOP-PKG-0047: remove 'where practicable' from Section 4 preamble; mandate dual-operator reconciliation with no exceptions. Owner: QA. Due: 14 Jul 2026.", done: false },
      { id: "c2", text: "Implement physical lot segregation for pre-printed labels in all Line 3 staging areas: install labeled lot bins with physical barriers. Owner: Facilities. Due: 30 Jul 2026.", done: false },
      { id: "c3", text: "Refresher training for all Line 3 packaging operators on SOP-PKG-0047 label reconciliation requirements. Owner: Training. Due: 21 Jul 2026.", done: false },
    ]
  },
  {
    title: "Effectiveness Checks", summary: "6-month monitoring post-CAPA implementation", defaultOpen: false,
    items: [
      { id: "e1", text: "Label error rate on Line 3: zero discrepancies during QA line clearances for 6 consecutive months post-SOP revision. Review date: Jan 2027.", done: false },
      { id: "e2", text: "Dual-operator reconciliation compliance: 100% compliance on 3 consecutive packaging campaigns. QA to verify via batch record review. Review: Oct 2026.", done: false },
      { id: "e3", text: "Verify lot segregation barriers installed on all Line 3 staging workstations. Photographic documentation required. Review: Aug 2026.", done: false },
    ]
  },
  {
    title: "Batch Disposition", summary: "BN3238646 Ã‚Â· Quarantine pending assessment", defaultOpen: false,
    items: [
      { id: "d1", text: "BN3238646 Ã¢â‚¬â€ ~1,200 quarantined units: relabeling assessment in progress. QA to approve relabeling protocol before units are reworked.", done: false },
      { id: "d2", text: "BN3238646 Ã¢â‚¬â€ 48,800 non-affected units: release assessment in progress. Confirmed unaffected; release recommended pending QA sign-off.", done: false },
      { id: "d3", text: "BN3238631 Ã¢â‚¬â€ confirm no label discrepancy. Reconciliation complete; no issue identified.", done: true },
    ]
  },
];

function RemediationStage({ onComplete }: { onComplete: () => void }) {
  const [done, setDone] = useState<Set<string>>(
    new Set(REMED_SECS.flatMap((s) => s.items.filter((i) => i.done).map((i) => i.id)))
  );
  const toggle = (id: string) => setDone((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-3">
      {REMED_SECS.map((sec) => (
        <Accordion key={sec.title} title={sec.title} summary={sec.summary} defaultOpen={sec.defaultOpen}
          badge={<span className="text-[10px] font-semibold text-[#6b6b7a] bg-[#f0f0f3] px-1.5 py-0.5 rounded ml-1">{sec.items.filter((i) => done.has(i.id)).length}/{sec.items.length}</span>}>
          <div className="space-y-2 pt-1">
            {sec.items.map((item) => (
              <div key={item.id} onClick={() => toggle(item.id)}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-[#f9f9fb] border border-[rgba(0,0,0,0.06)] cursor-pointer hover:bg-white transition-colors">
                <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${done.has(item.id) ? "bg-emerald-600" : "border-2 border-[rgba(0,0,0,0.2)] bg-white"}`}>
                  {done.has(item.id) && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <p className={`text-sm leading-relaxed transition-colors ${done.has(item.id) ? "text-[#6b6b7a] line-through" : "text-[#111118]"}`}>{item.text}</p>
              </div>
            ))}
          </div>
        </Accordion>
      ))}
      <GenerateCTA label="Generate Conclusion" onGenerate={onComplete}
        note="Conclusion will summarize investigation findings, root causes, and CAPA plan." />
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Stage 9: Conclusion Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

type ResolutionRecordDraftState = {
  root_cause_id: string;
  root_cause_statement: string;
  correction_decision: ResolutionDecision;
  correction_justification: string;
  correction_impacted_items: string;
  correction_actions: string;
  correction_owner: string;
  correction_due_date: string;
  correction_objective_evidence: string;
  correction_acceptance_criteria: string;
  correction_status: ResolutionStatus;
  corrective_action_decision: ResolutionDecision;
  corrective_action_justification: string;
  corrective_action_linked_root_causes: string;
  corrective_action_linked_causal_factors: string;
  corrective_action_owner: string;
  corrective_action_due_date: string;
  corrective_action_implementation_plan: string;
  corrective_action_expected_outcome: string;
  corrective_action_status: ResolutionStatus;
  preventive_action_decision: ResolutionDecision;
  preventive_action_justification: string;
  preventive_action_linked_root_causes: string;
  preventive_action_linked_causal_factors: string;
  preventive_action_owner: string;
  preventive_action_due_date: string;
  preventive_action_implementation_plan: string;
  preventive_action_expected_outcome: string;
  preventive_action_status: ResolutionStatus;
  effectiveness_required: boolean;
  effectiveness_goal: string;
  effectiveness_method: string;
  effectiveness_data_source: string;
  effectiveness_analysis_method: string;
  effectiveness_sample_size: string;
  effectiveness_duration: string;
  effectiveness_owner: string;
  effectiveness_success_criteria: string;
  effectiveness_adverse_effect_review: string;
  effectiveness_status: ResolutionStatus;
  review_notes: string;
  status: ResolutionStatus;
};

type ResolutionPlanDraftState = {
  records: ResolutionRecordDraftState[];
  review_notes: string;
  status: ResolutionStatus;
};

type ResolutionValidationState = {
  pass: boolean;
  warnings: string[];
  missing_fields: string[];
  recommendations: string[];
  status: ResolutionStatus;
};

type ResolutionAlignmentState = {
  root_cause_id: string;
  pass: boolean;
  warnings: string[];
  missing_fields: string[];
  recommendations: string[];
  correction_alignment: ResolutionStatus;
  corrective_action_alignment: ResolutionStatus;
  preventive_action_alignment: ResolutionStatus;
  effectiveness_alignment: ResolutionStatus;
  overall_status: ResolutionStatus;
};

type ResolutionAlignmentReportState = {
  pass: boolean;
  warnings: string[];
  missing_fields: string[];
  recommendations: string[];
  alignments: ResolutionAlignmentState[];
  overall_status: ResolutionStatus;
  readiness_for_downstream_capa_drafting: boolean;
};

const DEFAULT_RESOLUTION_VALIDATION: ResolutionValidationState = {
  pass: false,
  warnings: ["No resolution records have been documented."],
  missing_fields: ["resolution_records"],
  recommendations: ["Create a resolution record for each approved root cause."],
  status: "not_started",
};

const DEFAULT_RESOLUTION_ALIGNMENT: ResolutionAlignmentReportState = {
  pass: false,
  warnings: ["No resolution records have been documented."],
  missing_fields: ["resolution_plan"],
  recommendations: ["Create a resolution record for each approved root cause."],
  alignments: [],
  overall_status: "not_started",
  readiness_for_downstream_capa_drafting: false,
};

function normalizeResolutionRecordDraft(record?: ResolutionRecord | null): ResolutionRecordDraftState {
  return {
    root_cause_id: String(record?.root_cause_id || ""),
    root_cause_statement: String(record?.root_cause_statement || ""),
    correction_decision: record?.correction?.decision || "required",
    correction_justification: String(record?.correction?.justification || ""),
    correction_impacted_items: (record?.correction?.impacted_items || []).join("\n"),
    correction_actions: (record?.correction?.actions || []).join("\n"),
    correction_owner: String(record?.correction?.owner || ""),
    correction_due_date: String(record?.correction?.due_date || ""),
    correction_objective_evidence: (record?.correction?.objective_evidence || []).join("\n"),
    correction_acceptance_criteria: (record?.correction?.acceptance_criteria || []).join("\n"),
    correction_status: record?.correction?.status || "not_started",
    corrective_action_decision: record?.corrective_action?.decision || "required",
    corrective_action_justification: String(record?.corrective_action?.justification || ""),
    corrective_action_linked_root_causes: (record?.corrective_action?.linked_root_causes || []).join("\n"),
    corrective_action_linked_causal_factors: (record?.corrective_action?.linked_causal_factors || []).join("\n"),
    corrective_action_owner: String(record?.corrective_action?.owner || ""),
    corrective_action_due_date: String(record?.corrective_action?.due_date || ""),
    corrective_action_implementation_plan: (record?.corrective_action?.implementation_plan || []).join("\n"),
    corrective_action_expected_outcome: String(record?.corrective_action?.expected_outcome || ""),
    corrective_action_status: record?.corrective_action?.status || "not_started",
    preventive_action_decision: record?.preventive_action?.decision || "required",
    preventive_action_justification: String(record?.preventive_action?.justification || ""),
    preventive_action_linked_root_causes: (record?.preventive_action?.linked_root_causes || []).join("\n"),
    preventive_action_linked_causal_factors: (record?.preventive_action?.linked_causal_factors || []).join("\n"),
    preventive_action_owner: String(record?.preventive_action?.owner || ""),
    preventive_action_due_date: String(record?.preventive_action?.due_date || ""),
    preventive_action_implementation_plan: (record?.preventive_action?.implementation_plan || []).join("\n"),
    preventive_action_expected_outcome: String(record?.preventive_action?.expected_outcome || ""),
    preventive_action_status: record?.preventive_action?.status || "not_started",
    effectiveness_required: Boolean(record?.effectiveness_plan?.required),
    effectiveness_goal: String(record?.effectiveness_plan?.goal || ""),
    effectiveness_method: String(record?.effectiveness_plan?.method || ""),
    effectiveness_data_source: String(record?.effectiveness_plan?.data_source || ""),
    effectiveness_analysis_method: String(record?.effectiveness_plan?.analysis_method || ""),
    effectiveness_sample_size: String(record?.effectiveness_plan?.sample_size || ""),
    effectiveness_duration: String(record?.effectiveness_plan?.duration || ""),
    effectiveness_owner: String(record?.effectiveness_plan?.owner || ""),
    effectiveness_success_criteria: (record?.effectiveness_plan?.success_criteria || []).join("\n"),
    effectiveness_adverse_effect_review: String(record?.effectiveness_plan?.adverse_effect_review || ""),
    effectiveness_status: record?.effectiveness_plan?.status || "not_started",
    review_notes: (record?.review_notes || []).join("\n"),
    status: record?.status || "not_started",
  };
}

function normalizeResolutionPlanDraft(plan?: ResolutionPlan | null): ResolutionPlanDraftState {
  return {
    records: (plan?.resolution_records || []).map((record) => normalizeResolutionRecordDraft(record)),
    review_notes: (plan?.review_notes || []).join("\n"),
    status: plan?.status || "not_started",
  };
}

function normalizeResolutionValidation(validation?: WorkspaceCase["resolution_plan_validation"] | null): ResolutionValidationState {
  if (!validation) {
    return DEFAULT_RESOLUTION_VALIDATION;
  }

  return {
    pass: Boolean(validation.pass),
    warnings: validation.warnings || [],
    missing_fields: validation.missing_fields || [],
    recommendations: validation.recommendations || [],
    status: validation.status || "not_started",
  };
}

function normalizeResolutionAlignment(alignment?: WorkspaceCase["resolution_alignment"] | null): ResolutionAlignmentReportState {
  if (!alignment) {
    return DEFAULT_RESOLUTION_ALIGNMENT;
  }

  return {
    pass: Boolean(alignment.pass),
    warnings: alignment.warnings || [],
    missing_fields: alignment.missing_fields || [],
    recommendations: alignment.recommendations || [],
    alignments: (alignment.alignments || []).map((item) => ({
      root_cause_id: String(item.root_cause_id || ""),
      pass: Boolean(item.pass),
      warnings: item.warnings || [],
      missing_fields: item.missing_fields || [],
      recommendations: item.recommendations || [],
      correction_alignment: item.correction_alignment || "not_started",
      corrective_action_alignment: item.corrective_action_alignment || "not_started",
      preventive_action_alignment: item.preventive_action_alignment || "not_started",
      effectiveness_alignment: item.effectiveness_alignment || "not_started",
      overall_status: item.overall_status || "not_started",
    })),
    overall_status: alignment.overall_status || "not_started",
    readiness_for_downstream_capa_drafting: Boolean(alignment.readiness_for_downstream_capa_drafting),
  };
}

function normalizeCapaDraftValidation(validation?: WorkspaceCase["capa_draft_validation"] | null) {
  return {
    pass: Boolean(validation?.pass),
    warnings: validation?.warnings || [],
    missing_fields: validation?.missing_fields || [],
    recommendations: validation?.recommendations || [],
    status: formatCapaDraftStatus(validation?.status || "not_started"),
  };
}

function normalizeCapaLevelValidation(validation?: WorkspaceCase["capa_level_validation"] | null) {
  return {
    pass: Boolean(validation?.pass),
    warnings: validation?.warnings || [],
    missing_fields: validation?.missing_fields || [],
    recommendations: validation?.recommendations || [],
    status: formatCapaDraftStatus(validation?.status || "not_started"),
  };
}

function normalizeCapaLevelSummary(summary?: WorkspaceCase["capa_level_summary"] | null): CAPALevelSummary {
  return {
    case_id: String(summary?.case_id || ""),
    status: formatCapaDraftStatus(summary?.status || "not_started"),
    assignments: (summary?.assignments || []).map((item) => ({
      target_id: String(item?.target_id || ""),
      target_type: item?.target_type || "corrective_action_draft",
      assigned_level: item?.assigned_level || "unassigned",
      assigned_category: item?.assigned_category || "unassigned",
      rationale: String(item?.rationale || ""),
      evidence_refs: item?.evidence_refs || [],
      confidence: item?.confidence || "low",
      warnings: item?.warnings || [],
      status: formatCapaDraftStatus(item?.status || "not_started"),
      evidence: item?.evidence || [],
    })),
    summary: String(summary?.summary || ""),
    warnings: summary?.warnings || [],
    missing_fields: summary?.missing_fields || [],
    ready_for_review: Boolean(summary?.ready_for_review),
  };
}

function normalizeCapaLevelMismatch(mismatch?: CAPALevelMismatch | null) {
  return {
    field_name: mismatch?.field_name || "",
    mismatch_type: mismatch?.mismatch_type || "UNKNOWN",
    severity: mismatch?.severity || "warning",
    expected_value: mismatch?.expected_value || null,
    actual_value: mismatch?.actual_value || null,
    details: mismatch?.details || null,
  };
}

function normalizeCapaLevelRecordReview(review?: CAPALevelRecordReview | null) {
  return {
    record_id: review?.record_id || "",
    root_cause_id: review?.root_cause_id || "",
    passed: Boolean(review?.passed),
    assigned_level: review?.assigned_level || "unassigned",
    assigned_category: review?.assigned_category || "unassigned",
    review_result: review?.review_result || "review",
    confidence: review?.confidence || "low",
    mismatches: (review?.mismatches || []).map((mismatch) => normalizeCapaLevelMismatch(mismatch)),
    warnings: review?.warnings || [],
    recommendations: review?.recommendations || [],
    ready_for_review: Boolean(review?.ready_for_review),
    status: formatCapaDraftStatus(review?.status || "not_started"),
    review_notes: review?.review_notes || [],
    metadata: review?.metadata || {},
  };
}

function normalizeCapaLevelReview(review?: WorkspaceCase["capa_level_review"] | null) {
  return {
    case_id: review?.case_id || "",
    status: formatCapaDraftStatus(review?.status || "not_started"),
    overall_pass: Boolean(review?.overall_pass),
    overall_ready: Boolean(review?.overall_ready),
    record_reviews: (review?.record_reviews || []).map((record) => normalizeCapaLevelRecordReview(record)),
    warnings: review?.warnings || [],
    recommendations: review?.recommendations || [],
    summary: review?.summary || "",
    ready_for_review: Boolean(review?.ready_for_review),
    review_notes: review?.review_notes || [],
    metadata: review?.metadata || {},
  };
}

function normalizeCapaLevelReviewValidation(validation?: WorkspaceCase["capa_level_review_validation"] | null) {
  return {
    pass: Boolean(validation?.pass),
    warnings: validation?.warnings || [],
    missing_fields: validation?.missing_fields || [],
    recommendations: validation?.recommendations || [],
    status: formatCapaDraftStatus(validation?.status || "not_started"),
  };
}

function formatResolutionStatus(status: ResolutionValidationState["status"]) {
  if (status === "approved") return "approved";
  if (status === "ready_for_review") return "ready_for_review";
  if (status === "draft") return "draft";
  return "not_started";
}

function formatCapaDraftStatus(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "approved") return "approved";
  if (normalized === "ready_for_review") return "ready_for_review";
  if (normalized === "draft") return "draft";
  return "not_started";
}

function formatCapaLevelLabel(level?: string | null) {
  const normalized = String(level || "").trim().toLowerCase();
  const map: Record<string, string> = {
    level_1: "Level 1 Elimination",
    level_2: "Level 2 Replacement",
    level_3: "Level 3 Facilitation",
    level_4: "Level 4 Detection",
    level_5: "Level 5 Mitigation",
    unassigned: "Unassigned",
  };
  return map[normalized] || "Unassigned";
}

function formatCapaLevelCategory(category?: string | null) {
  const normalized = String(category || "").trim().toLowerCase();
  const map: Record<string, string> = {
    elimination: "Elimination",
    replacement: "Replacement",
    human_factor_design: "Human Factor Design",
    procedure: "Procedure",
    training: "Training",
    other: "Other",
    detection: "Detection",
    mitigation: "Mitigation",
    unassigned: "Unassigned",
  };
  return map[normalized] || "Unassigned";
}

function formatCapaLevelReviewStatus(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  const map: Record<string, string> = {
    not_started: "Not started",
    draft: "Draft",
    ready_for_review: "Ready for review",
    approved: "Reviewed",
  };
  return map[normalized] || "Not started";
}

function formatCapaLevelReviewResult(result?: string | null) {
  const normalized = String(result || "").trim().toLowerCase();
  const map: Record<string, string> = {
    pass: "Pass",
    review: "Review",
    fail: "Fail",
  };
  return map[normalized] || "Review";
}

function formatCapaLevelConfidence(confidence?: string | null) {
  const normalized = String(confidence || "").trim().toLowerCase();
  const map: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };
  return map[normalized] || "Not provided";
}

function resolutionStatusCopy(status: ResolutionValidationState["status"]) {
  if (status === "approved") return "Approved - ready for downstream use";
  if (status === "ready_for_review") return "Ready for review - structurally complete";
  if (status === "draft") return "Draft - continue building the plan";
  return "Not started - Resolution Planning has not started yet.";
}

function resolutionAlignmentCopy(status: ResolutionAlignmentState["overall_status"]) {
  if (status === "approved") return "Validated and ready for downstream CAPA drafting.";
  if (status === "ready_for_review") return "Complete enough for human review.";
  if (status === "draft") return "Partially complete or misaligned.";
  return "Not started - alignment review has not started yet.";
}

function humanizeResolutionSegment(value: string) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function formatResolutionRecordFieldLabel(path: string) {
  const parts = String(path || "").split(".").filter(Boolean);
  if (parts.length === 0) {
    return "Unspecified field";
  }

  const [section, ...rest] = parts;
  const sectionMap: Record<string, string> = {
    correction: "Correction",
    corrective_action: "Corrective Action",
    preventive_action: "Preventive Action",
    effectiveness_plan: "Effectiveness Plan",
    review_notes: "Review Notes",
    root_cause_id: "Root Cause ID",
    root_cause_statement: "Root Cause Statement",
    status: "Status",
  };

  const sectionLabel = sectionMap[section] || humanizeResolutionSegment(section);
  if (rest.length === 0) {
    return sectionLabel;
  }

  return `${sectionLabel} · ${rest.map((item) => humanizeResolutionSegment(item)).join(" · ")}`;
}

function formatResolutionFieldLabel(fieldPath: string) {
  const trimmed = String(fieldPath || "").trim();
  if (!trimmed) {
    return "Unspecified field";
  }

  if (trimmed === "resolution_plan") {
    return "Resolution Plan";
  }

  if (trimmed === "resolution_records") {
    return "Resolution Records";
  }

  const recordMatch = trimmed.match(/^resolution_records\[(\d+)\]\.(.+)$/);
  if (recordMatch) {
    return `Record ${Number(recordMatch[1]) + 1} · ${formatResolutionRecordFieldLabel(recordMatch[2])}`;
  }

  return formatResolutionRecordFieldLabel(trimmed);
}

function formatResolutionMessage(text: string) {
  return String(text || "")
    .replace(/resolution_records\[(\d+)\]\.[A-Za-z0-9_.]+/g, (match) => formatResolutionFieldLabel(match))
    .replace(/\b(correction|corrective_action|preventive_action|effectiveness_plan|review_notes|root_cause_id|root_cause_statement)\.[A-Za-z0-9_.]+\b/g, (match) => formatResolutionFieldLabel(match))
    .replace(/\bresolution_plan\b/gi, "Resolution Plan")
    .replace(/\bresolution_records\b/gi, "Resolution Records");
}

function resolutionCompactStatusTone(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  if (["approved", "pass", "ready_for_review"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (["draft", "review", "warning"].includes(normalized)) {
    return "bg-amber-50 text-amber-700";
  }
  if (["not_started", "fail"].includes(normalized)) {
    return "bg-rose-50 text-rose-700";
  }
  return "bg-[#f4f4f6] text-[#111118]";
}

function formatResolutionStatusLabel(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  const map: Record<string, string> = {
    not_started: "Not started",
    draft: "Draft",
    ready_for_review: "Ready for review",
    approved: "Approved",
    required: "Required",
    not_required: "Not required",
    pass: "Pass",
    review: "Review",
    fail: "Fail",
  };

  return map[normalized] || humanizeResolutionSegment(normalized);
}

function isResolutionTrackingField(field: string) {
  const normalized = String(field || "").trim().toLowerCase();
  return normalized === "due_date"
    || normalized.endsWith(".due_date")
    || normalized.includes("due_date");
}

function filterResolutionTrackingFields(items: string[]) {
  return items.filter((item) => !isResolutionTrackingField(item));
}

function filterResolutionValidationState(validation: ResolutionValidationState): ResolutionValidationState {
  return {
    ...validation,
    warnings: filterResolutionTrackingFields(validation.warnings),
    missing_fields: filterResolutionTrackingFields(validation.missing_fields),
    recommendations: filterResolutionTrackingFields(validation.recommendations),
  };
}

function filterResolutionAlignmentState(alignment: ResolutionAlignmentReportState): ResolutionAlignmentReportState {
  return {
    ...alignment,
    warnings: filterResolutionTrackingFields(alignment.warnings),
    missing_fields: filterResolutionTrackingFields(alignment.missing_fields),
    recommendations: filterResolutionTrackingFields(alignment.recommendations),
    alignments: alignment.alignments.map((item) => ({
      ...item,
      warnings: filterResolutionTrackingFields(item.warnings),
      missing_fields: filterResolutionTrackingFields(item.missing_fields),
      recommendations: filterResolutionTrackingFields(item.recommendations),
    })),
  };
}

function ResolutionStatusBadge({ label, status }: { label: string; status?: string | null }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${resolutionCompactStatusTone(status)}`}>
      {label}
    </span>
  );
}

const RESOLUTION_GENERATION_NOTE_PREFIX = "author generated a draft for";

function resolutionRecordReviewNotesLines(record: ResolutionRecordDraftState): string[] {
  return record.review_notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function resolutionRecordHasGenerationNote(record: ResolutionRecordDraftState): boolean {
  return resolutionRecordReviewNotesLines(record).some((line) => line.toLowerCase().startsWith(RESOLUTION_GENERATION_NOTE_PREFIX));
}

function resolutionRecordHasInvestigatorNotes(record: ResolutionRecordDraftState): boolean {
  return resolutionRecordReviewNotesLines(record).some((line) => !line.toLowerCase().startsWith(RESOLUTION_GENERATION_NOTE_PREFIX));
}

function resolutionRecordHasDraftBody(record: ResolutionRecordDraftState): boolean {
  const draftFields = [
    record.correction_justification,
    record.correction_impacted_items,
    record.correction_actions,
    record.correction_owner,
    record.correction_objective_evidence,
    record.correction_acceptance_criteria,
    record.corrective_action_justification,
    record.corrective_action_linked_root_causes,
    record.corrective_action_linked_causal_factors,
    record.corrective_action_owner,
    record.corrective_action_implementation_plan,
    record.corrective_action_expected_outcome,
    record.preventive_action_justification,
    record.preventive_action_linked_root_causes,
    record.preventive_action_linked_causal_factors,
    record.preventive_action_owner,
    record.preventive_action_implementation_plan,
    record.preventive_action_expected_outcome,
    record.effectiveness_goal,
    record.effectiveness_method,
    record.effectiveness_data_source,
    record.effectiveness_analysis_method,
    record.effectiveness_sample_size,
    record.effectiveness_duration,
    record.effectiveness_owner,
    record.effectiveness_success_criteria,
    record.effectiveness_adverse_effect_review,
  ];

  return draftFields.some((value) => Boolean(String(value || "").trim()));
}

function resolutionRecordIsEmptyForGeneration(record: ResolutionRecordDraftState): boolean {
  return !resolutionRecordHasDraftBody(record) && !resolutionRecordHasInvestigatorNotes(record) && !resolutionRecordHasGenerationNote(record);
}

function resolutionRecordHasInvestigatorAuthoredContent(record: ResolutionRecordDraftState): boolean {
  return resolutionRecordHasDraftBody(record) && !resolutionRecordHasGenerationNote(record) || resolutionRecordHasInvestigatorNotes(record);
}

type GenerationProgressStatus = "waiting" | "running" | "completed" | "error";

type GenerationProgressItem = {
  recordIndex: number;
  rootCauseId: string;
  status: GenerationProgressStatus;
};

function buildResolutionRecordPayload(draft: ResolutionRecordDraftState, existing?: ResolutionRecord | null): ResolutionRecord {
  return {
    root_cause_id: draft.root_cause_id.trim(),
    root_cause_statement: draft.root_cause_statement.trim(),
    correction: {
      id: existing?.correction?.id || "",
      decision: draft.correction_decision,
      justification: draft.correction_justification.trim() || null,
      impacted_items: parseMultilineList(draft.correction_impacted_items),
      actions: parseMultilineList(draft.correction_actions),
      owner: draft.correction_owner.trim() || null,
      due_date: draft.correction_due_date.trim() || null,
      objective_evidence: parseMultilineList(draft.correction_objective_evidence),
      acceptance_criteria: parseMultilineList(draft.correction_acceptance_criteria),
      status: draft.correction_status,
    },
    corrective_action: {
      id: existing?.corrective_action?.id || "",
      decision: draft.corrective_action_decision,
      justification: draft.corrective_action_justification.trim() || null,
      linked_root_causes: parseMultilineList(draft.corrective_action_linked_root_causes),
      linked_causal_factors: parseMultilineList(draft.corrective_action_linked_causal_factors),
      owner: draft.corrective_action_owner.trim() || null,
      due_date: draft.corrective_action_due_date.trim() || null,
      implementation_plan: parseMultilineList(draft.corrective_action_implementation_plan),
      expected_outcome: draft.corrective_action_expected_outcome.trim() || null,
      status: draft.corrective_action_status,
    },
    preventive_action: {
      id: existing?.preventive_action?.id || "",
      decision: draft.preventive_action_decision,
      justification: draft.preventive_action_justification.trim() || null,
      linked_root_causes: parseMultilineList(draft.preventive_action_linked_root_causes),
      linked_causal_factors: parseMultilineList(draft.preventive_action_linked_causal_factors),
      owner: draft.preventive_action_owner.trim() || null,
      due_date: draft.preventive_action_due_date.trim() || null,
      implementation_plan: parseMultilineList(draft.preventive_action_implementation_plan),
      expected_outcome: draft.preventive_action_expected_outcome.trim() || null,
      status: draft.preventive_action_status,
    },
    effectiveness_plan: {
      required: draft.effectiveness_required,
      goal: draft.effectiveness_goal.trim() || null,
      method: draft.effectiveness_method.trim() || null,
      data_source: draft.effectiveness_data_source.trim() || null,
      analysis_method: draft.effectiveness_analysis_method.trim() || null,
      sample_size: draft.effectiveness_sample_size.trim() || null,
      duration: draft.effectiveness_duration.trim() || null,
      owner: draft.effectiveness_owner.trim() || null,
      success_criteria: parseMultilineList(draft.effectiveness_success_criteria),
      adverse_effect_review: draft.effectiveness_adverse_effect_review.trim() || null,
      status: draft.effectiveness_status,
    },
    review_notes: parseMultilineList(draft.review_notes),
    status: draft.status,
  };
}

function buildResolutionPlanPayload(draft: ResolutionPlanDraftState, existing?: ResolutionPlan | null): ResolutionPlan {
  return {
    status: draft.status,
    resolution_records: draft.records.map((record, index) => buildResolutionRecordPayload(record, existing?.resolution_records?.[index])),
    review_notes: parseMultilineList(draft.review_notes),
    metadata: existing?.metadata || {},
  };
}

function ResolutionDetailSection({
  title,
  summary,
  status,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary: string;
  status?: string | null;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Accordion
      title={title}
      summary={summary}
      badge={<ResolutionStatusBadge label={formatResolutionStatusLabel(status)} status={status} />}
      defaultOpen={defaultOpen}
    >
      <div className="pt-1">{children}</div>
    </Accordion>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.1)] bg-[#f9f9fb] text-sm text-[#111118] focus:outline-none focus:ring-1 focus:ring-[#c0172d] focus:border-[#c0172d]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function ResolutionPlanStage({
  workspace,
  caseId,
  refreshWorkspace,
  isBusy,
  setBusy,
  setNotice,
  onComplete,
}: WorkspaceStageProps) {
  const storedPlan = workspace?.resolution_plan || null;
  const [draft, setDraft] = useState<ResolutionPlanDraftState>(() => normalizeResolutionPlanDraft(storedPlan));
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgressItem[]>([]);

  useEffect(() => {
    setDraft(normalizeResolutionPlanDraft(storedPlan));
  }, [caseId, storedPlan?.status, storedPlan?.resolution_records, storedPlan?.review_notes]);

  useEffect(() => {
    setSelectedRecordIndex((current) => {
      if (draft.records.length === 0) {
        return 0;
      }
      if (current < 0 || current >= draft.records.length) {
        return 0;
      }
      return current;
    });
  }, [draft.records.length]);

  const validationSummary = filterResolutionValidationState(normalizeResolutionValidation(workspace?.resolution_plan_validation));
  const alignmentSummary = filterResolutionAlignmentState(normalizeResolutionAlignment(workspace?.resolution_alignment));
  const currentStatus = formatResolutionStatus(alignmentSummary.overall_status);
  const activeRecord = draft.records[selectedRecordIndex] || null;
  const correctionSummary = activeRecord
    ? `Decision ${formatResolutionStatusLabel(activeRecord.correction_decision)} · Status ${formatResolutionStatusLabel(activeRecord.correction_status)}`
    : "";
  const correctiveActionSummary = activeRecord
    ? `Decision ${formatResolutionStatusLabel(activeRecord.corrective_action_decision)} · Status ${formatResolutionStatusLabel(activeRecord.corrective_action_status)}`
    : "";
  const preventiveActionSummary = activeRecord
    ? `Decision ${formatResolutionStatusLabel(activeRecord.preventive_action_decision)} · Status ${formatResolutionStatusLabel(activeRecord.preventive_action_status)}`
    : "";
  const effectivenessSummary = activeRecord
    ? `${activeRecord.effectiveness_required ? "Required" : "Not required"} · Status ${formatResolutionStatusLabel(activeRecord.effectiveness_status)}`
    : "";
  const emptyRecordIndexes = useMemo(
    () => draft.records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => resolutionRecordIsEmptyForGeneration(record))
      .map(({ index }) => index),
    [draft.records],
  );
  const hasInvestigatorAuthoredRecords = useMemo(
    () => draft.records.some((record) => resolutionRecordHasInvestigatorAuthoredContent(record)),
    [draft.records],
  );
  const shouldShowInitialGenerateButton = draft.records.length > 0
    && emptyRecordIndexes.length > 0
    && !hasInvestigatorAuthoredRecords;
  const isGenerationRunning = isBusy && generationProgress.some((item) => item.status === "running");

  const alignmentForRecord = (record: ResolutionRecordDraftState, index: number) => {
    const normalizedId = String(record.root_cause_id || "").trim().toLowerCase();
    if (normalizedId) {
      const byId = alignmentSummary.alignments.find((alignment) => String(alignment.root_cause_id || "").trim().toLowerCase() === normalizedId);
      if (byId) {
        return byId;
      }
    }
    return alignmentSummary.alignments[index] || null;
  };

  const hasRootCauseLink = (record: ResolutionRecordDraftState) => {
    return Boolean(String(record.root_cause_id || "").trim() && String(record.root_cause_statement || "").trim());
  };

  const updateRecord = <K extends keyof ResolutionRecordDraftState>(index: number, field: K, value: ResolutionRecordDraftState[K]) => {
    setDraft((current) => ({
      ...current,
      records: current.records.map((record, recordIndex) => (recordIndex === index ? { ...record, [field]: value } : record)),
    }));
  };

  const addRecord = () => {
    setDraft((current) => ({
      ...current,
      records: [
        ...current.records,
        normalizeResolutionRecordDraft({
          root_cause_id: `RC-${String(current.records.length + 1).padStart(3, "0")}`,
          status: "not_started",
        }),
      ],
    }));
    setSelectedRecordIndex(draft.records.length);
  };

  const removeRecord = (index: number) => {
    setDraft((current) => ({
      ...current,
      records: current.records.filter((_, recordIndex) => recordIndex !== index),
    }));
    setSelectedRecordIndex((current) => {
      if (current > index) {
        return current - 1;
      }
      if (current === index) {
        return Math.max(0, current - 1);
      }
      return current;
    });
  };

  const savePlan = async () => {
    if (!caseId || isBusy) {
      return;
    }

    setBusy(true);
    try {
      const nextDraft = draft.status === "not_started"
        ? { ...draft, status: "draft" as ResolutionStatus }
        : draft;
      const payload = buildResolutionPlanPayload(nextDraft, storedPlan);
      const nextWorkspace = await updateResolutionPlan(caseId, payload);
      setDraft(normalizeResolutionPlanDraft(nextWorkspace.resolution_plan || payload));
      await refreshWorkspace(caseId);
      const nextValidation = normalizeResolutionValidation(nextWorkspace.resolution_plan_validation || workspace?.resolution_plan_validation);
      setNotice({
        kind: nextValidation.pass ? "success" : "info",
        message: nextValidation.pass ? "Resolution Plan saved." : "Resolution Plan saved with validation warnings.",
      });
      onComplete();
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to save Resolution Plan.",
      });
    } finally {
      setBusy(false);
    }
  };

  const runResolutionGeneration = async (
    recordIndexes: number[],
    options?: { force?: boolean },
  ) => {
    if (!caseId || isBusy || recordIndexes.length === 0) {
      return;
    }

    const progressSeed: GenerationProgressItem[] = recordIndexes.map((recordIndex) => ({
      recordIndex,
      rootCauseId: draft.records[recordIndex]?.root_cause_id || `Record ${recordIndex + 1}`,
      status: "waiting",
    }));

    setGenerationProgress(progressSeed);
    setBusy(true);

    try {
      let latestWorkspace = workspace;
      for (const recordIndex of recordIndexes) {
        setGenerationProgress((current) => current.map((item) => (
          item.recordIndex === recordIndex ? { ...item, status: "running" } : item
        )));

        const targetRecord = draft.records[recordIndex];
        if (!targetRecord) {
          setGenerationProgress((current) => current.map((item) => (
            item.recordIndex === recordIndex ? { ...item, status: "error" } : item
          )));
          continue;
        }

        const nextWorkspace = await generateResolution(caseId, {
          root_cause_id: targetRecord.root_cause_id || undefined,
          record_index: recordIndex,
          force: Boolean(options?.force),
          only_empty: !options?.force,
        });

        latestWorkspace = nextWorkspace;
        setDraft(normalizeResolutionPlanDraft(nextWorkspace.resolution_plan || latestWorkspace?.resolution_plan || null));
        setGenerationProgress((current) => current.map((item) => (
          item.recordIndex === recordIndex ? { ...item, status: "completed" } : item
        )));
      }

      const refreshed = await refreshWorkspace(caseId);
      setDraft(normalizeResolutionPlanDraft(refreshed.resolution_plan || latestWorkspace?.resolution_plan || null));
      const refreshedValidation = normalizeResolutionValidation(refreshed.resolution_plan_validation);
      setNotice({
        kind: refreshedValidation.pass ? "success" : "info",
        message: refreshedValidation.pass
          ? "Resolution drafts generated and validated."
          : "Resolution drafts generated. Validation warnings remain.",
      });
    } catch (error) {
      setGenerationProgress((current) => current.map((item) => (
        item.status === "running" ? { ...item, status: "error" } : item
      )));
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to generate Resolution drafts.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateResolutionPlans = async () => {
    await runResolutionGeneration(emptyRecordIndexes, { force: false });
  };

  const handleGenerateAllEmptyRecords = async () => {
    await runResolutionGeneration(emptyRecordIndexes, { force: false });
  };

  const handleRegenerateSelectedRecord = async () => {
    if (!activeRecord) {
      return;
    }

    const confirmed = window.confirm(
      "Regenerate draft for this Resolution record? Existing draft content for this record will be replaced.",
    );
    if (!confirmed) {
      return;
    }

    await runResolutionGeneration([selectedRecordIndex], { force: true });
  };

  const generationProgressValue = (status: GenerationProgressStatus) => {
    if (status === "completed") return 100;
    if (status === "running") return 55;
    if (status === "error") return 100;
    return 6;
  };

  const generationProgressLabel = (status: GenerationProgressStatus) => {
    if (status === "completed") return "Completed";
    if (status === "running") return "Generating";
    if (status === "error") return "Error";
    return "Waiting";
  };
  const isGenerating = generationProgress.some((item) => item.status === "running");

  return (
    <div className="space-y-4" data-testid="resolution-plan-section">
      <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,0,0,0.05)]">
          <Settings size={13} className="text-[#6b6b7a]" />
          <span className="text-sm font-semibold text-[#111118] flex-1">Resolution Planning</span>
          <span className="text-[11px] text-[#6b6b7a]">Structure corrections, corrective actions, preventive actions, and effectiveness planning by root cause.</span>
        </div>
        <div className="grid gap-4 px-4 py-4">
          {shouldShowInitialGenerateButton && (
            <div className="rounded-xl border border-[#f5d4da] bg-[#fff7f8] px-4 py-4" data-testid="resolution-generate-cta">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#111118]">AUTHOR can draft Resolution Plans from the completed investigation.</p>
                  <p className="mt-1 text-xs text-[#6b6b7a]">Generate only empty records and then review, edit, and save.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleGenerateResolutionPlans()}
                  disabled={isBusy || emptyRecordIndexes.length === 0}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#c0172d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a8142a] disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="generate-resolution-plans-button"
                >
                  {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {isGenerating ? "Generating" : "Generate Resolution Plans"}
                </button>
              </div>
            </div>
          )}

          {generationProgress.length > 0 && (
            <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4" data-testid="resolution-generation-progress">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#111118]">Generating Resolution Plan...</p>
                {isGenerationRunning && <RefreshCw size={14} className="animate-spin text-[#6b6b7a]" />}
              </div>
              <div className="mt-3 space-y-2">
                {generationProgress.map((item) => (
                  <div key={`${item.rootCauseId}-${item.recordIndex}`} className="space-y-1" data-testid={`resolution-generation-progress-item-${item.recordIndex}`}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#111118]">{item.rootCauseId}</span>
                      <span className="text-[#6b6b7a]">{generationProgressLabel(item.status)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#f1f1f4]">
                      <div
                        className={`h-full rounded-full transition-all ${item.status === "error" ? "bg-rose-500" : "bg-[#c0172d]"}`}
                        style={{ width: `${generationProgressValue(item.status)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {draft.records.length === 0 && (
            <div className="rounded-xl border border-dashed border-[rgba(0,0,0,0.12)] bg-[#fafafa] px-4 py-6 text-sm text-[#6b6b7a]" data-testid="resolution-plan-empty-state">
              No persisted resolution records yet. AUTHOR will display records automatically when approved root causes are available.
            </div>
          )}
          {draft.records.length > 0 && activeRecord && (
            <div className="grid gap-4 lg:grid-cols-[270px,1fr]">
              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#fcfcfd] p-3" data-testid="resolution-record-selector">
                <div className="flex items-center justify-between gap-2 px-2 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Resolution Records</p>
                  <span className="rounded-full bg-[#f4f4f6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#111118]">{draft.records.length}</span>
                </div>
                <div className="space-y-2">
                  {draft.records.map((record, index) => {
                    const alignment = alignmentForRecord(record, index);
                    const selected = index === selectedRecordIndex;
                    return (
                      <button
                        key={`${record.root_cause_id || "record"}-${index}`}
                        type="button"
                        onClick={() => setSelectedRecordIndex(index)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${selected ? "border-[#c0172d] bg-[#fff5f6]" : "border-[rgba(0,0,0,0.08)] bg-white hover:bg-[#fafafa]"}`}
                        data-testid={`resolution-record-selector-item-${index}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#111118]">{record.root_cause_id || `Record ${index + 1}`}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#6b6b7a]">{record.root_cause_statement || "No root cause statement"}</p>
                          </div>
                          <ResolutionStatusBadge label={formatResolutionStatusLabel(record.status)} status={record.status} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${resolutionCompactStatusTone(record.correction_status)}`}>Corr · {formatResolutionStatusLabel(record.correction_status)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${resolutionCompactStatusTone(record.corrective_action_status)}`}>CA · {formatResolutionStatusLabel(record.corrective_action_status)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${resolutionCompactStatusTone(record.preventive_action_status)}`}>Prev · {formatResolutionStatusLabel(record.preventive_action_status)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${resolutionCompactStatusTone(record.effectiveness_status)}`}>Eff · {formatResolutionStatusLabel(record.effectiveness_status)}</span>
                          {alignment && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${resolutionCompactStatusTone(alignment.overall_status)}`}>
                              Align · {formatResolutionStatusLabel(alignment.overall_status)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={addRecord}
                  className="mt-3 w-full rounded-lg border border-dashed border-[rgba(0,0,0,0.16)] bg-white px-3 py-2 text-sm font-semibold text-[#111118] hover:bg-[#fafafa]"
                  data-testid="add-resolution-record-button"
                >
                  Add Resolution Record
                </button>
              </div>

              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#fcfcfd] p-4 space-y-4" data-testid="resolution-record-editor">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Resolution Record</p>
                    <p className="text-sm font-semibold text-[#111118]" data-testid="resolution-record-active-id">{activeRecord.root_cause_id || `Record ${selectedRecordIndex + 1}`}</p>
                    <p className="mt-1 max-w-3xl text-xs leading-5 text-[#6b6b7a]" data-testid="resolution-record-active-statement">{activeRecord.root_cause_statement || "No root cause statement available yet."}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${resolutionCompactStatusTone(activeRecord.status)}`}>Status · {formatResolutionStatusLabel(activeRecord.status)}</span>
                      {hasRootCauseLink(activeRecord) && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700" data-testid="resolution-record-source-indicator">
                          Generated from approved root cause
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRegenerateSelectedRecord()}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1 rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-[11px] font-semibold text-[#111118] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
                      data-testid="regenerate-resolution-record-button"
                    >
                      <RefreshCw size={12} />
                      Regenerate Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRecord(selectedRecordIndex)}
                      className="text-[11px] font-semibold text-[#c0172d] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <AutoGrowEditField label="Root Cause ID" value={activeRecord.root_cause_id} rows={1} onChange={(value) => updateRecord(selectedRecordIndex, "root_cause_id", value)} />
                  <AutoGrowEditField label="Root Cause Statement" value={activeRecord.root_cause_statement} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "root_cause_statement", value)} />
                </div>

                <ResolutionDetailSection title="Correction" summary={correctionSummary} status={activeRecord.correction_status} defaultOpen>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Decision"
                      value={activeRecord.correction_decision}
                      options={[{ value: "required", label: "Required" }, { value: "not_required", label: "Not required" }]}
                      onChange={(value) => updateRecord(selectedRecordIndex, "correction_decision", value as ResolutionDecision)}
                    />
                    <SelectField
                      label="Status"
                      value={activeRecord.correction_status}
                      options={[
                        { value: "not_started", label: "Not started" },
                        { value: "draft", label: "Draft" },
                        { value: "ready_for_review", label: "Ready for review" },
                        { value: "approved", label: "Approved" },
                      ]}
                      onChange={(value) => updateRecord(selectedRecordIndex, "correction_status", value as ResolutionStatus)}
                    />
                    <AutoGrowEditField label="Justification" value={activeRecord.correction_justification} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "correction_justification", value)} />
                    <AutoGrowEditField label="Impacted Items" value={activeRecord.correction_impacted_items} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "correction_impacted_items", value)} />
                    <AutoGrowEditField label="Actions" value={activeRecord.correction_actions} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "correction_actions", value)} />
                    <AutoGrowEditField label="Owner" value={activeRecord.correction_owner} rows={1} onChange={(value) => updateRecord(selectedRecordIndex, "correction_owner", value)} />
                    <AutoGrowEditField label="Objective Evidence" value={activeRecord.correction_objective_evidence} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "correction_objective_evidence", value)} />
                    <AutoGrowEditField label="Acceptance Criteria" value={activeRecord.correction_acceptance_criteria} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "correction_acceptance_criteria", value)} />
                  </div>
                </ResolutionDetailSection>

                <ResolutionDetailSection title="Corrective Action" summary={correctiveActionSummary} status={activeRecord.corrective_action_status}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Decision"
                      value={activeRecord.corrective_action_decision}
                      options={[{ value: "required", label: "Required" }, { value: "not_required", label: "Not required" }]}
                      onChange={(value) => updateRecord(selectedRecordIndex, "corrective_action_decision", value as ResolutionDecision)}
                    />
                    <SelectField
                      label="Status"
                      value={activeRecord.corrective_action_status}
                      options={[
                        { value: "not_started", label: "Not started" },
                        { value: "draft", label: "Draft" },
                        { value: "ready_for_review", label: "Ready for review" },
                        { value: "approved", label: "Approved" },
                      ]}
                      onChange={(value) => updateRecord(selectedRecordIndex, "corrective_action_status", value as ResolutionStatus)}
                    />
                    <AutoGrowEditField label="Justification" value={activeRecord.corrective_action_justification} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "corrective_action_justification", value)} />
                    <AutoGrowEditField label="Linked Root Causes" value={activeRecord.corrective_action_linked_root_causes} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "corrective_action_linked_root_causes", value)} />
                    <AutoGrowEditField label="Linked Causal Factors" value={activeRecord.corrective_action_linked_causal_factors} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "corrective_action_linked_causal_factors", value)} />
                    <AutoGrowEditField label="Owner" value={activeRecord.corrective_action_owner} rows={1} onChange={(value) => updateRecord(selectedRecordIndex, "corrective_action_owner", value)} />
                    <AutoGrowEditField label="Implementation Plan" value={activeRecord.corrective_action_implementation_plan} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "corrective_action_implementation_plan", value)} />
                    <AutoGrowEditField label="Expected Outcome" value={activeRecord.corrective_action_expected_outcome} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "corrective_action_expected_outcome", value)} />
                  </div>
                </ResolutionDetailSection>

                <ResolutionDetailSection title="Preventive Action" summary={preventiveActionSummary} status={activeRecord.preventive_action_status}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Decision"
                      value={activeRecord.preventive_action_decision}
                      options={[{ value: "required", label: "Required" }, { value: "not_required", label: "Not required" }]}
                      onChange={(value) => updateRecord(selectedRecordIndex, "preventive_action_decision", value as ResolutionDecision)}
                    />
                    <SelectField
                      label="Status"
                      value={activeRecord.preventive_action_status}
                      options={[
                        { value: "not_started", label: "Not started" },
                        { value: "draft", label: "Draft" },
                        { value: "ready_for_review", label: "Ready for review" },
                        { value: "approved", label: "Approved" },
                      ]}
                      onChange={(value) => updateRecord(selectedRecordIndex, "preventive_action_status", value as ResolutionStatus)}
                    />
                    <AutoGrowEditField label="Justification" value={activeRecord.preventive_action_justification} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "preventive_action_justification", value)} />
                    <AutoGrowEditField label="Linked Root Causes" value={activeRecord.preventive_action_linked_root_causes} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "preventive_action_linked_root_causes", value)} />
                    <AutoGrowEditField label="Linked Causal Factors" value={activeRecord.preventive_action_linked_causal_factors} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "preventive_action_linked_causal_factors", value)} />
                    <AutoGrowEditField label="Owner" value={activeRecord.preventive_action_owner} rows={1} onChange={(value) => updateRecord(selectedRecordIndex, "preventive_action_owner", value)} />
                    <AutoGrowEditField label="Implementation Plan" value={activeRecord.preventive_action_implementation_plan} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "preventive_action_implementation_plan", value)} />
                    <AutoGrowEditField label="Expected Outcome" value={activeRecord.preventive_action_expected_outcome} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "preventive_action_expected_outcome", value)} />
                  </div>
                </ResolutionDetailSection>

                <ResolutionDetailSection title="Effectiveness Plan" summary={effectivenessSummary} status={activeRecord.effectiveness_status}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#fafafa] px-3 py-2 text-sm font-medium text-[#111118] md:col-span-2">
                      <input
                        type="checkbox"
                        checked={activeRecord.effectiveness_required}
                        onChange={(event) => updateRecord(selectedRecordIndex, "effectiveness_required", event.target.checked)}
                        className="h-4 w-4 rounded border border-[rgba(0,0,0,0.2)]"
                      />
                      Effectiveness required
                    </label>
                    <SelectField
                      label="Status"
                      value={activeRecord.effectiveness_status}
                      options={[
                        { value: "not_started", label: "Not started" },
                        { value: "draft", label: "Draft" },
                        { value: "ready_for_review", label: "Ready for review" },
                        { value: "approved", label: "Approved" },
                      ]}
                      onChange={(value) => updateRecord(selectedRecordIndex, "effectiveness_status", value as ResolutionStatus)}
                    />
                    <div />
                    <AutoGrowEditField label="Goal" value={activeRecord.effectiveness_goal} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "effectiveness_goal", value)} />
                    <AutoGrowEditField label="Method" value={activeRecord.effectiveness_method} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "effectiveness_method", value)} />
                    <AutoGrowEditField label="Data Source" value={activeRecord.effectiveness_data_source} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "effectiveness_data_source", value)} />
                    <AutoGrowEditField label="Analysis Method" value={activeRecord.effectiveness_analysis_method} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "effectiveness_analysis_method", value)} />
                    <AutoGrowEditField label="Sample Size" value={activeRecord.effectiveness_sample_size} rows={1} onChange={(value) => updateRecord(selectedRecordIndex, "effectiveness_sample_size", value)} />
                    <AutoGrowEditField label="Duration" value={activeRecord.effectiveness_duration} rows={1} onChange={(value) => updateRecord(selectedRecordIndex, "effectiveness_duration", value)} />
                    <AutoGrowEditField label="Owner" value={activeRecord.effectiveness_owner} rows={1} onChange={(value) => updateRecord(selectedRecordIndex, "effectiveness_owner", value)} />
                    <AutoGrowEditField label="Success Criteria" value={activeRecord.effectiveness_success_criteria} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "effectiveness_success_criteria", value)} />
                    <AutoGrowEditField label="Adverse Effect Review" value={activeRecord.effectiveness_adverse_effect_review} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "effectiveness_adverse_effect_review", value)} />
                  </div>
                </ResolutionDetailSection>

                <ResolutionDetailSection title="Review Notes" summary={activeRecord.review_notes ? "Investigator-authored notes and generation notes" : "No review notes yet"} status={activeRecord.review_notes ? "draft" : "not_started"}>
                  <AutoGrowEditField label="Review Notes" value={activeRecord.review_notes} rows={2} onChange={(value) => updateRecord(selectedRecordIndex, "review_notes", value)} />
                </ResolutionDetailSection>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3" data-testid="resolution-plan-validation-panel">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Validation Status</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${validationSummary.pass ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} data-testid="resolution-plan-validation-result">
              {validationSummary.pass ? "Pass" : "Fail"}
            </span>
            <span className="rounded-full bg-[#f4f4f6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#111118]" data-testid="resolution-plan-status">
              {currentStatus}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-[#111118]">{resolutionStatusCopy(validationSummary.status)}</p>
          <p className="mt-1 text-xs text-[#6b6b7a]">{resolutionAlignmentCopy(alignmentSummary.overall_status)}</p>
          {validationSummary.warnings.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Warnings</p>
              <div className="mt-2 space-y-1.5">
                {validationSummary.warnings.map((warning) => (
                  <p key={warning} className="text-xs text-[#6b6b7a]">{formatResolutionMessage(warning)}</p>
                ))}
              </div>
            </div>
          )}
          {validationSummary.recommendations.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Recommendations</p>
              <div className="mt-2 space-y-1.5">
                {validationSummary.recommendations.map((item) => (
                  <div key={item} className="rounded-lg bg-[#f9f9fb] px-3 py-2 text-xs text-[#111118]">
                    {formatResolutionMessage(item)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3" data-testid="resolution-plan-alignment-panel">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Alignment Review</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${alignmentSummary.pass ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} data-testid="resolution-plan-alignment-result">
              {alignmentSummary.pass ? "Pass" : "Fail"}
            </span>
            <span className="rounded-full bg-[#f4f4f6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#111118]" data-testid="resolution-plan-alignment-status">
              {alignmentSummary.overall_status}
            </span>
            {alignmentSummary.readiness_for_downstream_capa_drafting && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700" data-testid="resolution-plan-ready-note">
                Ready for downstream CAPA drafting
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-semibold text-[#111118]">{resolutionAlignmentCopy(alignmentSummary.overall_status)}</p>
          {alignmentSummary.warnings.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Warnings</p>
              <div className="mt-2 space-y-1.5">
                {alignmentSummary.warnings.map((warning) => (
                  <p key={warning} className="text-xs text-[#6b6b7a]">{formatResolutionMessage(warning)}</p>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Missing Fields</p>
              <p className="mt-1 text-sm font-semibold text-[#111118]">{alignmentSummary.missing_fields.length || 0}</p>
              {alignmentSummary.missing_fields.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2" data-testid="resolution-plan-missing-fields">
                  {alignmentSummary.missing_fields.map((field) => (
                    <span key={field} className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700">
                      {formatResolutionFieldLabel(field)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Recommendations</p>
              <div className="mt-2 space-y-1.5">
                {(alignmentSummary.recommendations.length > 0 ? alignmentSummary.recommendations : validationSummary.recommendations).map((item) => (
                  <div key={item} className="rounded-lg bg-[#f9f9fb] px-3 py-2 text-xs text-[#111118]">
                    {formatResolutionMessage(item)}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-2" data-testid="resolution-plan-alignment-records">
            {alignmentSummary.alignments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[rgba(0,0,0,0.12)] bg-[#fafafa] px-3 py-2 text-xs text-[#6b6b7a]">
                No aligned resolution records yet.
              </div>
            ) : (
              alignmentSummary.alignments.map((alignment, index) => (
                <div key={`${alignment.root_cause_id || "alignment"}-${index}`} className="rounded-xl border border-[rgba(0,0,0,0.07)] bg-[#fafafa] px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#111118]">{alignment.root_cause_id || `Root Cause ${index + 1}`}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${alignment.overall_status === "approved" ? "bg-emerald-50 text-emerald-700" : alignment.overall_status === "ready_for_review" ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"}`}>
                      {alignment.overall_status}
                    </span>
                    <span className="text-[11px] text-[#6b6b7a]">
                      Correction {alignment.correction_alignment} · Corrective {alignment.corrective_action_alignment} · Preventive {alignment.preventive_action_alignment} · Effectiveness {alignment.effectiveness_alignment}
                    </span>
                  </div>
                  {(alignment.warnings.length > 0 || alignment.missing_fields.length > 0) && (
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {alignment.warnings.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Warnings</p>
                          <div className="mt-1 space-y-1">
                            {alignment.warnings.map((warning) => (
                              <p key={warning} className="text-xs text-[#6b6b7a]">{formatResolutionMessage(warning)}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {alignment.missing_fields.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Missing Fields</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {alignment.missing_fields.map((field) => (
                              <span key={field} className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-700">
                                {formatResolutionFieldLabel(field)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
        <p className="text-[10px] text-[#6b6b7a] flex items-center gap-1">
          <Info size={10} />
          Resolution Planning is investigator-authored. AUTHOR stores and validates the structured plan only.
        </p>
        <div className="flex items-center gap-2">
          {emptyRecordIndexes.length > 0 && (
            <button
              type="button"
              onClick={() => void handleGenerateAllEmptyRecords()}
              disabled={isBusy}
              className="flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white text-sm font-semibold text-[#111118] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="generate-all-empty-records-button"
            >
              {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isGenerating ? "Generating" : "Generate All Empty Records"}
            </button>
          )}
          <button
            onClick={() => void savePlan()}
            disabled={isBusy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#c0172d] text-white hover:bg-[#a8142a] shadow-sm transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            Save and Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function CAPADraftStage({
  workspace,
  caseId,
  refreshWorkspace,
  isBusy,
  setBusy,
  setNotice,
  onComplete,
}: WorkspaceStageProps) {
  const storedDraft = workspace?.capa_draft || null;
  const [draft, setDraft] = useState<CAPADraft>(() => (
    storedDraft || {
      case_id: caseId,
      status: "not_started",
      source_resolution_record_ids: [],
      records: [],
      summary: "",
      missing_fields: [],
      warnings: [],
      ready_for_review: false,
      review_notes: [],
      metadata: {},
    }
  ));
  const draftRef = useRef<CAPADraft>(draft);
  const setDraftState = (next: CAPADraft | ((current: CAPADraft) => CAPADraft)) => {
    setDraft((current) => {
      const resolved = typeof next === "function"
        ? (next as (current: CAPADraft) => CAPADraft)(current)
        : next;
      draftRef.current = resolved;
      return resolved;
    });
  };
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);
  const [generationProgress, setGenerationProgress] = useState<Array<{ recordIndex: number; rootCauseId: string; status: "waiting" | "running" | "completed" | "error" }>>([]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    setDraftState(
      storedDraft || {
        case_id: caseId,
        status: "not_started",
        source_resolution_record_ids: [],
        records: [],
        summary: "",
        missing_fields: [],
        warnings: [],
        ready_for_review: false,
        review_notes: [],
        metadata: {},
      },
    );
  }, [caseId, storedDraft]);

  const validation = normalizeCapaDraftValidation(workspace?.capa_draft_validation);
  const records = draft.records || [];
  const activeRecord = records[selectedRecordIndex] || null;
  const draftGenerationCount = Number((draft.metadata as Record<string, unknown> | undefined)?.generation_count || 0);
  const reviewNotes = draft.review_notes || [];

  const recordHasAuthoredContent = (record: NonNullable<CAPADraft["records"]>[number]) => {
    const hasAction = (action?: Record<string, unknown>) => {
      if (!action) return false;
      const values = [
        action.justification,
        action.statement,
        action.owner,
        action.due_date,
        ...(Array.isArray(action.objective_evidence) ? action.objective_evidence : []),
        ...(Array.isArray(action.acceptance_criteria) ? action.acceptance_criteria : []),
        ...(Array.isArray(action.implementation_plan) ? action.implementation_plan : []),
        action.expected_outcome,
      ];
      return values.some((value) => String(value || "").trim().length > 0);
    };
    const effectiveness = record.effectiveness_draft || {};
    return Boolean(
      hasAction(record.correction_draft as Record<string, unknown>)
      || hasAction(record.corrective_action_draft as Record<string, unknown>)
      || hasAction(record.preventive_action_draft as Record<string, unknown>)
      || [
        effectiveness.goal,
        effectiveness.method,
        effectiveness.data_source,
        effectiveness.analysis_method,
        effectiveness.sample_size,
        effectiveness.duration,
        effectiveness.owner,
        ...(Array.isArray(effectiveness.success_criteria) ? effectiveness.success_criteria : []),
        effectiveness.adverse_effect_review,
      ].some((value) => String(value || "").trim().length > 0),
    );
  };

  const recordHasGenerationNote = (record: NonNullable<CAPADraft["records"]>[number]) => {
    const rootCauseId = String(record.root_cause_id || "").trim();
    if (!rootCauseId) return false;
    return reviewNotes.some((note) => (
      String(note || "").toLowerCase().includes("author generated capa draft content")
      && String(note || "").toLowerCase().includes(rootCauseId.toLowerCase())
    ));
  };

  const emptyRecordIndexes = records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => !recordHasGenerationNote(record))
    .map(({ index }) => index);
  const shouldShowGenerateButton = records.length > 0
    && draftGenerationCount === 0;
  const isGenerating = generationProgress.some((item) => item.status === "running");

  const updateDraftRecord = (
    index: number,
    section: "correction_draft" | "corrective_action_draft" | "preventive_action_draft" | "effectiveness_draft",
    field: string,
    value: string,
  ) => {
    setDraftState((current) => ({
      ...current,
      records: (current.records || []).map((record, recordIndex) => {
        if (recordIndex !== index) return record;
        const nextSection = { ...(record[section] || {}), [field]: value };
        return { ...record, [section]: nextSection };
      }),
    }));
  };

  const setDraftSummary = (value: string) => {
    setDraftState((current) => ({ ...current, summary: value }));
  };

  const setDraftReviewNotes = (value: string) => {
    const notes = value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    setDraftState((current) => ({ ...current, review_notes: notes }));
  };

  const saveDraft = async () => {
    if (!caseId || isBusy) return;
    setBusy(true);
    try {
      const currentDraft = draftRef.current;
      const payload: CAPADraft = {
        ...currentDraft,
        case_id: currentDraft.case_id || caseId,
      };
      const nextWorkspace = await updateCapaDraft(caseId, payload);
      setDraftState(nextWorkspace.capa_draft || payload);
      await refreshWorkspace(caseId);
      setNotice({
        kind: "success",
        message: "CAPA draft saved.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to save CAPA draft.",
      });
    } finally {
      setBusy(false);
    }
  };

  const runGeneration = async (indexes: number[], options?: { force?: boolean }) => {
    if (!caseId || isBusy || indexes.length === 0) return;

    setGenerationProgress(
      indexes.map((recordIndex) => ({
        recordIndex,
        rootCauseId: records[recordIndex]?.root_cause_id || `Record ${recordIndex + 1}`,
        status: "waiting",
      })),
    );

    setBusy(true);
    try {
      let latest = workspace;
      for (const recordIndex of indexes) {
        setGenerationProgress((current) => current.map((item) => (
          item.recordIndex === recordIndex ? { ...item, status: "running" } : item
        )));
        const nextWorkspace = await generateCapaDraft(caseId, {
          record_index: recordIndex,
          root_cause_id: records[recordIndex]?.root_cause_id,
          force: Boolean(options?.force),
          only_empty: !options?.force,
        });
        latest = nextWorkspace;
        setDraftState(nextWorkspace.capa_draft || latest?.capa_draft || draftRef.current);
        setGenerationProgress((current) => current.map((item) => (
          item.recordIndex === recordIndex ? { ...item, status: "completed" } : item
        )));
      }
      const refreshed = await refreshWorkspace(caseId);
      setDraftState(refreshed?.capa_draft || latest?.capa_draft || draftRef.current);
      setNotice({
        kind: "success",
        message: "CAPA draft generation completed.",
      });
    } catch (error) {
      setGenerationProgress((current) => current.map((item) => (
        item.status === "running" ? { ...item, status: "error" } : item
      )));
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to generate CAPA draft.",
      });
    } finally {
      setBusy(false);
    }
  };

  const regenerateSelectedRecord = async () => {
    if (!activeRecord) return;
    const confirmed = window.confirm("Regenerate CAPA draft for this record? Existing draft content for this record will be replaced.");
    if (!confirmed) return;
    await runGeneration([selectedRecordIndex], { force: true });
  };

  return (
    <div className="space-y-4" data-testid="capa-draft-section">
      <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,0,0,0.05)]">
          <Archive size={13} className="text-[#6b6b7a]" />
          <span className="text-sm font-semibold text-[#111118] flex-1">CAPA Draft</span>
          <span className="text-[11px] text-[#6b6b7a]">Draft generation from persisted Resolution records.</span>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#fafafa] px-4 py-3" data-testid="capa-draft-validation-panel">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Validation Status</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${validation.pass ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} data-testid="capa-draft-validation-result">
                {validation.pass ? "Pass" : "Fail"}
              </span>
              <span className="rounded-full bg-[#f4f4f6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#111118]" data-testid="capa-draft-status">
                {formatCapaDraftStatus(draft.status)}
              </span>
            </div>
          </div>

          {shouldShowGenerateButton && (
            <div className="rounded-xl border border-[#f5d4da] bg-[#fff7f8] px-4 py-4" data-testid="capa-draft-generate-cta">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#111118]">Generate CAPA Draft</p>
                  <p className="mt-1 text-xs text-[#6b6b7a]">AUTHOR drafts CAPA content from persisted Resolution content and investigation context.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void runGeneration(emptyRecordIndexes, { force: false })}
                  disabled={isBusy || emptyRecordIndexes.length === 0}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#c0172d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a8142a] disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="generate-capa-draft-button"
                >
                  {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {isGenerating ? "Generating" : "Generate CAPA Draft"}
                </button>
              </div>
            </div>
          )}

          {generationProgress.length > 0 && (
            <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4" data-testid="capa-draft-generation-progress">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#111118]">Generating CAPA Draft...</p>
                {isBusy && <RefreshCw size={14} className="animate-spin text-[#6b6b7a]" />}
              </div>
              <div className="mt-3 space-y-2">
                {generationProgress.map((item) => (
                  <div key={`${item.rootCauseId}-${item.recordIndex}`} className="space-y-1" data-testid={`capa-draft-generation-progress-item-${item.recordIndex}`}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#111118]">{item.rootCauseId}</span>
                      <span className="text-[#6b6b7a]">{item.status === "running" ? "Generating" : item.status === "completed" ? "Completed" : item.status === "error" ? "Error" : "Waiting"}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#f1f1f4]">
                      <div className={`h-full rounded-full transition-all ${item.status === "error" ? "bg-rose-500" : "bg-[#c0172d]"}`} style={{ width: `${item.status === "completed" ? 100 : item.status === "running" ? 55 : 8}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] px-4 py-3">
            <EditField
              label="CAPA Summary"
              value={String(draft.summary || "")}
              rows={3}
              onChange={setDraftSummary}
            />
            <div className="mt-3">
              <EditField
                label="Review Notes"
                value={(draft.review_notes || []).join("\n")}
                rows={3}
                onChange={setDraftReviewNotes}
              />
            </div>
          </div>

          {records.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[rgba(0,0,0,0.12)] bg-[#fafafa] px-4 py-6 text-sm text-[#6b6b7a]">
              No content-ready resolution records have been bridged yet.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#fcfcfd] p-3" data-testid="capa-draft-record-selector">
                <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">CAPA Records</p>
                <div className="space-y-2">
                  {records.map((record, index) => (
                    <button
                      key={`${record.root_cause_id || "record"}-${index}`}
                      type="button"
                      onClick={() => setSelectedRecordIndex(index)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${index === selectedRecordIndex ? "border-[#c0172d] bg-[#fff5f6]" : "border-[rgba(0,0,0,0.08)] bg-white hover:bg-[#fafafa]"}`}
                      data-testid={`capa-draft-record-selector-item-${index}`}
                    >
                      <p className="text-sm font-semibold text-[#111118]">{record.root_cause_id || `Record ${index + 1}`}</p>
                      <p className="mt-1 text-xs text-[#6b6b7a]">{record.alignment_status || "not_started"}</p>
                    </button>
                  ))}
                </div>
              </div>

              {activeRecord && (
                <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#fcfcfd] p-4 space-y-4" data-testid="capa-draft-record-editor">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Active CAPA Record</p>
                      <p className="text-sm font-semibold text-[#111118]" data-testid="capa-draft-active-record-id">{activeRecord.root_cause_id || `Record ${selectedRecordIndex + 1}`}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void regenerateSelectedRecord()}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-[11px] font-semibold text-[#111118] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
                      data-testid="regenerate-capa-draft-record-button"
                    >
                      {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      {isGenerating ? "Generating" : "Regenerate Draft"}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <EditField label="Correction Statement" value={String(activeRecord.correction_draft?.statement || "")} rows={2} onChange={(value) => updateDraftRecord(selectedRecordIndex, "correction_draft", "statement", value)} />
                    <EditField label="Correction Justification" value={String(activeRecord.correction_draft?.justification || "")} rows={2} onChange={(value) => updateDraftRecord(selectedRecordIndex, "correction_draft", "justification", value)} />
                    <EditField label="Corrective Action Statement" value={String(activeRecord.corrective_action_draft?.statement || "")} rows={2} onChange={(value) => updateDraftRecord(selectedRecordIndex, "corrective_action_draft", "statement", value)} />
                    <EditField label="Preventive Action Statement" value={String(activeRecord.preventive_action_draft?.statement || "")} rows={2} onChange={(value) => updateDraftRecord(selectedRecordIndex, "preventive_action_draft", "statement", value)} />
                    <EditField label="Effectiveness Goal" value={String(activeRecord.effectiveness_draft?.goal || "")} rows={2} onChange={(value) => updateDraftRecord(selectedRecordIndex, "effectiveness_draft", "goal", value)} />
                    <EditField label="Effectiveness Method" value={String(activeRecord.effectiveness_draft?.method || "")} rows={2} onChange={(value) => updateDraftRecord(selectedRecordIndex, "effectiveness_draft", "method", value)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
        <p className="text-[10px] text-[#6b6b7a] flex items-center gap-1">
          <Info size={10} />
          CAPA Draft remains investigator-controlled; generation populates missing content and validator remains authoritative.
        </p>
        <div className="flex items-center gap-2">
          {emptyRecordIndexes.length > 0 && (
            <button
              type="button"
              onClick={() => void runGeneration(emptyRecordIndexes, { force: false })}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white text-sm font-semibold text-[#111118] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="generate-all-empty-capa-records-button"
            >
              <Sparkles size={14} />
              Generate All Empty Records
            </button>
          )}
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={isBusy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#c0172d] text-white hover:bg-[#a8142a] shadow-sm transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            data-testid="save-capa-draft-button"
          >
            <Save size={14} />
            Save CAPA Draft
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#111118] text-white hover:bg-[#22222a] shadow-sm transition-colors shrink-0"
          >
            Continue
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CAPALevelStage({
  workspace,
  caseId,
  refreshWorkspace,
  isBusy,
  setBusy,
  setNotice,
  onComplete,
}: WorkspaceStageProps) {
  const storedSummary = workspace?.capa_level_summary || null;
  const storedReview = workspace?.capa_level_review || null;
  const [summaryDraft, setSummaryDraft] = useState<CAPALevelSummary>(() => normalizeCapaLevelSummary(storedSummary));
  const [reviewDraft, setReviewDraft] = useState<CAPALevelReview>(() => normalizeCapaLevelReview(storedReview));
  const [selectedAssignmentIndex, setSelectedAssignmentIndex] = useState(0);
  const [generationProgress, setGenerationProgress] = useState<Array<{ assignmentIndex: number; targetId: string; status: "waiting" | "running" | "completed" | "error" }>>([]);

  useEffect(() => {
    setSummaryDraft(normalizeCapaLevelSummary(storedSummary));
  }, [caseId, storedSummary]);

  useEffect(() => {
    setReviewDraft(normalizeCapaLevelReview(storedReview));
  }, [caseId, storedReview]);

  useEffect(() => {
    setSelectedAssignmentIndex((current) => {
      const count = summaryDraft.assignments?.length || 0;
      if (!count) return 0;
      return current >= count ? 0 : current;
    });
  }, [summaryDraft.assignments?.length]);

  const validation = normalizeCapaLevelValidation(workspace?.capa_level_validation);
  const reviewValidation = normalizeCapaLevelReviewValidation(workspace?.capa_level_review_validation);
  const normalizedReview = normalizeCapaLevelReview(workspace?.capa_level_review);
  const assignments = summaryDraft.assignments || [];
  const activeAssignment = assignments[selectedAssignmentIndex] || null;

  const emptyAssignmentIndexes = assignments
    .map((assignment, index) => ({ assignment, index }))
    .filter(({ assignment }) => {
      const level = String(assignment.assigned_level || "").trim().toLowerCase();
      const category = String(assignment.assigned_category || "").trim().toLowerCase();
      const rationale = String(assignment.rationale || "").trim();
      return level === "" || level === "unassigned" || category === "" || category === "unassigned" || !rationale;
    })
    .map(({ index }) => index);

  const hasInvestigatorAuthoredAssignments = assignments.some((assignment) => {
    const level = String(assignment.assigned_level || "").trim().toLowerCase();
    const rationale = String(assignment.rationale || "").trim();
    return (level && level !== "unassigned") || Boolean(rationale);
  });

  const hasValidCapaDraft = Boolean(
    workspace?.capa_draft_validation?.pass
    && (workspace?.capa_draft?.records || []).length > 0,
  );

  const shouldShowGenerateButton = hasValidCapaDraft
    && assignments.length > 0
    && emptyAssignmentIndexes.length > 0
    && !hasInvestigatorAuthoredAssignments;
  const isGenerating = generationProgress.some((item) => item.status === "running");

  const updateAssignment = (
    index: number,
    field: keyof NonNullable<CAPALevelSummary["assignments"]>[number],
    value: string,
  ) => {
    setSummaryDraft((current) => ({
      ...current,
      assignments: (current.assignments || []).map((assignment, assignmentIndex) => (
        assignmentIndex === index
          ? {
            ...assignment,
            [field]: field === "evidence_refs"
              ? parseMultilineList(value)
              : value,
          }
          : assignment
      )),
    }));
  };

  const saveSummary = async () => {
    if (!caseId || isBusy) return;
    setBusy(true);
    try {
      const payload: CAPALevelSummary = {
        ...summaryDraft,
        case_id: summaryDraft.case_id || caseId,
      };
      const nextWorkspace = await updateCapaLevelSummary(caseId, payload);
      setSummaryDraft(normalizeCapaLevelSummary(nextWorkspace.capa_level_summary || payload));
      await refreshWorkspace(caseId);
      setNotice({
        kind: "success",
        message: "CAPA level assignments saved.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to save CAPA level assignments.",
      });
    } finally {
      setBusy(false);
    }
  };

  const saveReview = async () => {
    if (!caseId || isBusy) return;
    setBusy(true);
    try {
      const payload: CAPALevelReview = {
        ...reviewDraft,
        case_id: reviewDraft.case_id || caseId,
        review_notes: parseMultilineList((reviewDraft.review_notes || []).join("\n")),
      };
      const nextWorkspace = await updateCapaLevelReview(caseId, payload);
      setReviewDraft(normalizeCapaLevelReview(nextWorkspace.capa_level_review || payload));
      await refreshWorkspace(caseId);
      setNotice({
        kind: "success",
        message: "CAPA level review notes saved.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to save CAPA level review notes.",
      });
    } finally {
      setBusy(false);
    }
  };

  const runGeneration = async (indexes: number[], options?: { force?: boolean }) => {
    if (!caseId || isBusy || indexes.length === 0) return;

    setGenerationProgress(
      indexes.map((assignmentIndex) => ({
        assignmentIndex,
        targetId: assignments[assignmentIndex]?.target_id || `Assignment ${assignmentIndex + 1}`,
        status: "waiting",
      })),
    );

    setBusy(true);
    try {
      let latestWorkspace = workspace;
      for (const assignmentIndex of indexes) {
        setGenerationProgress((current) => current.map((item) => (
          item.assignmentIndex === assignmentIndex ? { ...item, status: "running" } : item
        )));

        const assignment = assignments[assignmentIndex];
        if (!assignment) {
          setGenerationProgress((current) => current.map((item) => (
            item.assignmentIndex === assignmentIndex ? { ...item, status: "error" } : item
          )));
          continue;
        }

        const nextWorkspace = await generateCapaLevelAssignment(caseId, {
          target_id: assignment.target_id,
          assignment_index: assignmentIndex,
          force: Boolean(options?.force),
          only_empty: !options?.force,
        });

        latestWorkspace = nextWorkspace;
        setSummaryDraft(normalizeCapaLevelSummary(nextWorkspace.capa_level_summary || latestWorkspace?.capa_level_summary || null));
        setGenerationProgress((current) => current.map((item) => (
          item.assignmentIndex === assignmentIndex ? { ...item, status: "completed" } : item
        )));
      }

      const refreshed = await refreshWorkspace(caseId);
      setSummaryDraft(normalizeCapaLevelSummary(refreshed?.capa_level_summary || latestWorkspace?.capa_level_summary || null));
      setReviewDraft(normalizeCapaLevelReview(refreshed?.capa_level_review || latestWorkspace?.capa_level_review || null));
      setNotice({
        kind: validation.pass ? "success" : "info",
        message: "CAPA level assignment generation completed.",
      });
    } catch (error) {
      setGenerationProgress((current) => current.map((item) => (
        item.status === "running" ? { ...item, status: "error" } : item
      )));
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to generate CAPA level assignments.",
      });
    } finally {
      setBusy(false);
    }
  };

  const regenerateSelectedAssignment = async () => {
    if (!activeAssignment) return;
    const confirmed = window.confirm("Regenerate this CAPA level assignment? Existing assignment content for this target will be replaced.");
    if (!confirmed) return;
    await runGeneration([selectedAssignmentIndex], { force: true });
  };

  return (
    <div className="space-y-4" data-testid="capa-level-section">
      <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden" data-testid="capa-level-panel">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,0,0,0.05)]">
          <ClipboardList size={13} className="text-[#6b6b7a]" />
          <span className="text-sm font-semibold text-[#111118] flex-1">CAPA Level Assignment</span>
          <span className="text-[11px] text-[#6b6b7a]">Generate and edit persisted CAPA level assignments from the approved CAPA draft.</span>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#fafafa] px-4 py-3" data-testid="capa-level-validation-panel">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Validation Status</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${validation.pass ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} data-testid="capa-level-validation-result">
                {validation.pass ? "Pass" : "Fail"}
              </span>
              <span className="rounded-full bg-[#f4f4f6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#111118]" data-testid="capa-level-status">
                {formatCapaDraftStatus(summaryDraft.status)}
              </span>
              {summaryDraft.ready_for_review && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700" data-testid="capa-level-ready-note">
                  Ready for review
                </span>
              )}
            </div>
          </div>

          {shouldShowGenerateButton && (
            <div className="rounded-xl border border-[#f5d4da] bg-[#fff7f8] px-4 py-4" data-testid="capa-level-generate-cta">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#111118]">Generate CAPA Level Assignment</p>
                  <p className="mt-1 text-xs text-[#6b6b7a]">AUTHOR drafts missing CAPA level assignments from persisted CAPA draft content.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void runGeneration(emptyAssignmentIndexes, { force: false })}
                  disabled={isBusy || emptyAssignmentIndexes.length === 0}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#c0172d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a8142a] disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="generate-capa-level-assignment-button"
                >
                  {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {isGenerating ? "Generating" : "Generate CAPA Level Assignment"}
                </button>
              </div>
            </div>
          )}

          {generationProgress.length > 0 && (
            <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4" data-testid="capa-level-generation-progress">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#111118]">Generating CAPA Level Assignment...</p>
                {isBusy && <RefreshCw size={14} className="animate-spin text-[#6b6b7a]" />}
              </div>
              <div className="mt-3 space-y-2">
                {generationProgress.map((item) => (
                  <div key={`${item.targetId}-${item.assignmentIndex}`} className="space-y-1" data-testid={`capa-level-generation-progress-item-${item.assignmentIndex}`}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#111118]">{item.targetId}</span>
                      <span className="text-[#6b6b7a]">{item.status === "running" ? "Generating" : item.status === "completed" ? "Completed" : item.status === "error" ? "Error" : "Waiting"}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#f1f1f4]">
                      <div className={`h-full rounded-full transition-all ${item.status === "error" ? "bg-rose-500" : "bg-[#c0172d]"}`} style={{ width: `${item.status === "completed" ? 100 : item.status === "running" ? 55 : 8}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assignments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[rgba(0,0,0,0.12)] bg-[#fafafa] px-4 py-6 text-sm text-[#6b6b7a]" data-testid="capa-level-empty-state">
              No CAPA level assignments have been generated yet.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
              <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#fcfcfd] p-3" data-testid="capa-level-assignment-selector">
                <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Assignments</p>
                <div className="space-y-2">
                  {assignments.map((assignment, index) => (
                    <button
                      key={`${assignment.target_id || "assignment"}-${index}`}
                      type="button"
                      onClick={() => setSelectedAssignmentIndex(index)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${index === selectedAssignmentIndex ? "border-[#c0172d] bg-[#fff5f6]" : "border-[rgba(0,0,0,0.08)] bg-white hover:bg-[#fafafa]"}`}
                      data-testid={`capa-level-assignment-selector-item-${index}`}
                    >
                      <p className="text-sm font-semibold text-[#111118]">{assignment.target_id || `Assignment ${index + 1}`}</p>
                      <p className="mt-1 text-xs text-[#6b6b7a]">{formatCapaLevelLabel(assignment.assigned_level)} · {formatCapaLevelCategory(assignment.assigned_category)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {activeAssignment && (
                <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#fcfcfd] p-4 space-y-4" data-testid="capa-level-assignment-editor">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Active Assignment</p>
                      <p className="text-sm font-semibold text-[#111118]" data-testid="capa-level-active-assignment-id">{activeAssignment.target_id || `Assignment ${selectedAssignmentIndex + 1}`}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void regenerateSelectedAssignment()}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-[rgba(0,0,0,0.12)] bg-white px-2 py-1 text-[11px] font-semibold text-[#111118] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
                      data-testid="regenerate-capa-level-assignment-button"
                    >
                      {isGenerating ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      {isGenerating ? "Generating" : "Regenerate Assignment"}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Assigned Level"
                      value={String(activeAssignment.assigned_level || "unassigned")}
                      options={[
                        { value: "unassigned", label: "unassigned" },
                        { value: "level_1", label: "level_1" },
                        { value: "level_2", label: "level_2" },
                        { value: "level_3", label: "level_3" },
                        { value: "level_4", label: "level_4" },
                        { value: "level_5", label: "level_5" },
                      ]}
                      onChange={(value) => updateAssignment(selectedAssignmentIndex, "assigned_level", value)}
                    />
                    <SelectField
                      label="Assigned Category"
                      value={String(activeAssignment.assigned_category || "unassigned")}
                      options={[
                        { value: "unassigned", label: "unassigned" },
                        { value: "elimination", label: "elimination" },
                        { value: "replacement", label: "replacement" },
                        { value: "human_factor_design", label: "human_factor_design" },
                        { value: "procedure", label: "procedure" },
                        { value: "training", label: "training" },
                        { value: "other", label: "other" },
                        { value: "detection", label: "detection" },
                        { value: "mitigation", label: "mitigation" },
                      ]}
                      onChange={(value) => updateAssignment(selectedAssignmentIndex, "assigned_category", value)}
                    />
                    <EditField
                      label="Rationale"
                      value={String(activeAssignment.rationale || "")}
                      rows={3}
                      onChange={(value) => updateAssignment(selectedAssignmentIndex, "rationale", value)}
                    />
                    <EditField
                      label="Evidence References"
                      value={(activeAssignment.evidence_refs || []).join("\n")}
                      rows={3}
                      onChange={(value) => updateAssignment(selectedAssignmentIndex, "evidence_refs", value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3" data-testid="capa-level-warnings">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Warnings</p>
              <div className="mt-2 space-y-1">
                {validation.warnings.map((warning) => (
                  <p key={warning} className="text-xs text-[#6b6b7a]">{warning}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden" data-testid="capa-level-review-panel">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,0,0,0.05)]">
          <AlertCircle size={13} className="text-[#6b6b7a]" />
          <span className="text-sm font-semibold text-[#111118] flex-1">CAPA Level Review</span>
          <span className="text-[11px] text-[#6b6b7a]">Review persisted assignments, mismatches, and recommendations before report generation.</span>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#fafafa] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${reviewValidation.pass ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} data-testid="capa-level-review-validation-result">
                {reviewValidation.pass ? "Pass" : "Fail"}
              </span>
              <span className="rounded-full bg-[#f4f4f6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#111118]" data-testid="capa-level-review-status">
                {formatCapaLevelReviewStatus(normalizedReview.status)}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${normalizedReview.overall_ready ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} data-testid="capa-level-review-ready-state">
                {normalizedReview.overall_ready ? "Ready" : "Not ready"}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[#111118]">{normalizedReview.summary || "No CAPA Level Review has been recorded yet."}</p>
          </div>

          <EditField
            label="Review Summary"
            value={String(reviewDraft.summary || "")}
            rows={2}
            onChange={(value) => setReviewDraft((current) => ({ ...current, summary: value }))}
          />
          <EditField
            label="Review Notes"
            value={(reviewDraft.review_notes || []).join("\n")}
            rows={3}
            onChange={(value) => setReviewDraft((current) => ({ ...current, review_notes: parseMultilineList(value) }))}
          />

          <div className="space-y-2" data-testid="capa-level-review-records">
            {normalizedReview.record_reviews.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[rgba(0,0,0,0.12)] bg-[#fafafa] px-3 py-2 text-xs text-[#6b6b7a]">
                No CAPA Level Review records have been generated yet.
              </div>
            ) : (
              normalizedReview.record_reviews.map((record, index) => {
                const hasCritical = (record.mismatches || []).some((mismatch) => mismatch.severity === "critical");
                return (
                  <div
                    key={`${record.record_id || "record"}-${index}`}
                    className="rounded-xl border border-[rgba(0,0,0,0.07)] bg-[#fafafa] px-3 py-3"
                    data-testid="capa-level-review-record"
                    data-critical-mismatch={hasCritical ? "true" : "false"}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#111118]">{record.root_cause_id || record.record_id || `Record ${index + 1}`}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${record.review_result === "pass" ? "bg-emerald-50 text-emerald-700" : record.review_result === "fail" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>
                        {formatCapaLevelReviewResult(record.review_result)}
                      </span>
                      <span className="text-[11px] text-[#6b6b7a]">{formatCapaLevelLabel(record.assigned_level)} · {formatCapaLevelCategory(record.assigned_category)} · {formatCapaLevelConfidence(record.confidence)}</span>
                    </div>

                    {(record.mismatches || []).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(record.mismatches || []).map((mismatch, mismatchIndex) => (
                          <p key={`${mismatch.field_name || "field"}-${mismatchIndex}`} className="text-xs text-[#6b6b7a]">
                            {mismatch.field_name}: {mismatch.mismatch_type} ({mismatch.severity})
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {reviewValidation.missing_fields.length > 0 && (
            <div className="flex flex-wrap gap-2" data-testid="capa-level-review-missing-fields">
              {reviewValidation.missing_fields.map((field) => (
                <span key={field} className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700">
                  {field}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void saveReview()}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white text-sm font-semibold text-[#111118] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="save-capa-level-review-button"
            >
              <Save size={14} />
              Save Review Notes
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
        <p className="text-[10px] text-[#6b6b7a] flex items-center gap-1">
          <Info size={10} />
          CAPA Level content is persisted and validator-driven. Generation drafts missing content only unless explicit regeneration is requested.
        </p>
        <div className="flex items-center gap-2">
          {emptyAssignmentIndexes.length > 0 && (
            <button
              type="button"
              onClick={() => void runGeneration(emptyAssignmentIndexes, { force: false })}
              disabled={isBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white text-sm font-semibold text-[#111118] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="generate-all-empty-capa-level-assignments-button"
            >
              <Sparkles size={14} />
              Generate All Empty Assignments
            </button>
          )}
          <button
            type="button"
            onClick={() => void saveSummary()}
            disabled={isBusy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#c0172d] text-white hover:bg-[#a8142a] shadow-sm transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
            data-testid="save-capa-level-button"
          >
            <Save size={14} />
            Save CAPA Level
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#111118] text-white hover:bg-[#22222a] shadow-sm transition-colors shrink-0"
          >
            Continue
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

const CONCLUSION_PANELS = [
  { title: "Investigation Summary", border: "border-l-blue-400", text: "On 14 May 2026, shipper labels for Lot BN3238646 (Viberzi CIV 75mg Tabs) were incorrectly applied to cartons from an adjacent lot during secondary packaging on Line 3. Detected during shift-change line clearance by QA Associate M. Hoffmann. ~1,200 units quarantined. No material released to distribution." },
  { title: "Root Cause Summary", border: "border-l-[#c0172d]", text: "Two contributing root causes identified: (1) Omission of the mandatory dual-operator label reconciliation check required by SOP-PKG-0047 Rev. 3 Ã‚Â§4.3, driven by time pressure and ambiguous SOP language. (2) Absence of physical lot segregation controls for pre-printed label stock in the shared staging area." },
  { title: "Product Impact Summary", border: "border-l-orange-400", text: "~1,200 units of BN3238646 quarantined. 48,800 non-affected units pending release. No mislabeled units entered the distribution chain. No patient safety events reported. No regulatory reporting obligation identified at this time." },
  { title: "Risk Summary", border: "border-l-amber-400", text: "Risk assessed as Medium (Score 9/25). Severity: Moderate (3/5) Ã¢â‚¬â€ external shipper label only; formulation and primary packaging unaffected. Likelihood: Possible (3/5) Ã¢â‚¬â€ recurring deviation pattern identified in historical review. No immediate patient safety risk." },
  { title: "CAPA Summary", border: "border-l-emerald-500", text: "Three systemic CAPA actions approved: (1) SOP-PKG-0047 revision to mandate dual-operator reconciliation without exception (due 14 Jul). (2) Physical lot segregation installation on Line 3 (due 30 Jul). (3) Operator refresher training (due 21 Jul). Effectiveness review: January 2027." },
  { title: "Final Recommendation", border: "border-l-purple-500", text: "Investigation complete. Recommend: (1) Release of 48,800 non-affected units following QA sign-off. (2) Initiation of relabeling protocol for ~1,200 quarantined units. (3) No market recall warranted. (4) Implement CAPA plan as specified. Deviation classified Major, repeat, and recurring." },
];

function ConclusionStage({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
        <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-xs text-emerald-800 leading-relaxed">Investigation complete. Review all conclusion panels before preparing the export package.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {CONCLUSION_PANELS.map((p) => (
          <div key={p.title} className={`rounded-xl border border-l-4 ${p.border} border-[rgba(0,0,0,0.08)] bg-white px-4 py-4`}>
            <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2">{p.title}</p>
            <p className="text-sm text-[#111118] leading-relaxed">{p.text}</p>
          </div>
        ))}
      </div>
      <GenerateCTA label="Prepare Export Package" onGenerate={onComplete}
        note="AUTHOR will compile all investigation sections into a final report package." />
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Stage 10: Export Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function openInvestigationPdf(workspace?: WorkspaceCase | null, caseId?: string) {
  const report = buildInvestigationReport(workspace, caseId);
  const html = createInvestigationReportDocument(report);
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    return "The PDF report could not open because your browser blocked the pop-up. Allow pop-ups for this site and try again.";
  }
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
  window.setTimeout(() => {
    reportWindow.focus();
    reportWindow.print();
  }, 0);
  return null;
}

function ExportStage({ onComplete: _onComplete, caseId, workspace }: { onComplete: () => void; caseId?: string; workspace?: WorkspaceCase | null }) {
  const [fmt, setFmt] = useState<"pdf" | "json" | "package">("pdf");
  const [exported, setExported] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const formats = [
    { id: "pdf" as const, label: "PDF Report", desc: "Formatted investigation report for QMS entry", icon: FileText },
    { id: "json" as const, label: "JSON Data", desc: "Structured data for system integration", icon: BarChart3 },
    { id: "package" as const, label: "Investigation Package", desc: "PDF + evidence files + JSON in a ZIP archive", icon: Archive },
  ];

  const sections = ["Initial Quality Review Summary", "Evidence Library", "Accepted Facts", "Sequence of Events", "Investigation Findings", "Root Cause Analysis", "Historical Review", "Risk Assessment", "Resolution Plan", "CAPA Draft", "Conclusion", ...(fmt === "package" ? ["Appendices / Attachments"] : [])];

  const exportPdf = () => {
    setExportError(null);
    const error = openInvestigationPdf(workspace, caseId);
    if (error) {
      setExportError(error);
      return;
    }
    setExported(true);
  };

  const handleExport = () => {
    if (fmt === "pdf") {
      exportPdf();
      return;
    }
    setExportError(`${formats.find((item) => item.id === fmt)?.label || "This format"} is not available yet. Select PDF Report to export this investigation.`);
  };

  if (exported) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mb-5">
        <CheckCircle2 size={28} className="text-emerald-600" />
      </div>
      <h3 className="text-lg font-bold text-[#111118] mb-1">Export Complete</h3>
      <p className="text-sm text-[#6b6b7a] max-w-xs mb-6">
        {WORKSPACE_LABEL} investigation report exported successfully. Enter the content into your QMS before use in a regulated context.
      </p>
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-6">
        {[
          { lbl: "Sections", val: String(sections.length), color: "text-[#111118]" },
          { lbl: "Format", val: formats.find((f) => f.id === fmt)?.label.split(" ")[0] ?? "PDF", color: "text-[#111118]" },
          { lbl: "Status", val: "Complete", color: "text-emerald-600" },
        ].map(({ lbl, val, color }) => (
          <div key={lbl} className="px-3 py-3 rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb]">
            <p className={`text-base font-bold ${color}`}>{val}</p>
            <p className="text-[10px] text-[#6b6b7a] font-medium mt-0.5">{lbl}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setExported(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[rgba(0,0,0,0.12)] text-sm font-medium text-[#111118] hover:bg-[#f4f4f6] transition-colors"><RotateCcw size={13} />Export Again</button>
        <button onClick={exportPdf} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c0172d] text-white text-sm font-semibold hover:bg-[#a8142a] transition-colors"><Eye size={13} />View Report</button>
      </div>
      <p className="text-[10px] text-[#6b6b7a] mt-6 max-w-xs leading-relaxed">AUTHOR supports assisted drafting only. Final content must be reviewed by a qualified person before entry into GTW or equivalent QMS.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <ReviewPanel
        caseId={caseId || ""}
        reviewGate="review_export"
        title="Export Review Gate"
        description="Run the final read-only export review before generating a package. This does not export or persist any case changes."
        buttonLabel="Review Export"
        onReview={reviewExport}
        testIdPrefix="review-export"
      />

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
        <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-emerald-800">Investigation complete Ã¢â‚¬â€ ready to export</p>
          <p className="text-xs text-emerald-700 mt-0.5">All 8 prior workflow steps completed. Select a format and generate the final report.</p>
        </div>
      </div>

      <div className="px-4 py-4 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white">
        <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-3">Case Summary</p>
        <div className="grid grid-cols-2 gap-y-3 gap-x-8">
          {[["Case", WORKSPACE_LABEL], ["Product", WORKSPACE_CONTEXT], ["Batch", "Not available"], ["Classification", "Not available"],
          ["Root Cause", "Pending"], ["Risk Level", "Pending"], ["CAPA Draft", "0 records"], ["Report Date", "Not available"]
          ].map(([k, v]) => <FieldRow key={k} label={k} value={v} />)}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2.5">Export Format</p>
        <div className="grid grid-cols-3 gap-2.5">
          {formats.map(({ id, label, desc, icon: Icon }) => (
            <button key={id} onClick={() => setFmt(id)}
              className={`text-left px-4 py-3.5 rounded-xl border transition-colors ${fmt === id ? "border-[#c0172d] bg-[#fde8eb]" : "border-[rgba(0,0,0,0.09)] bg-white hover:border-[rgba(0,0,0,0.16)]"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={13} className={fmt === id ? "text-[#c0172d]" : "text-[#6b6b7a]"} />
                <span className={`text-xs font-bold ${fmt === id ? "text-[#c0172d]" : "text-[#111118]"}`}>{label}</span>
                {fmt === id && <Check size={11} className="text-[#c0172d] ml-auto" />}
              </div>
              <p className="text-[11px] text-[#6b6b7a] leading-snug">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider mb-2.5">Included Sections</p>
        <div className="grid grid-cols-2 gap-1.5">
          {sections.map((s) => (
            <div key={s} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[rgba(0,0,0,0.07)]">
              <div className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 bg-[#c0172d]">
                <Check size={9} className="text-white" strokeWidth={3} />
              </div>
              <p className="text-xs text-[#111118] font-medium">{s}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-4 border-t border-[rgba(0,0,0,0.06)]">
        <p className="text-[10px] text-[#6b6b7a] flex items-center gap-1"><Info size={10} />AUTHOR supports assisted drafting only. Content must be reviewed before QMS entry.</p>
        <button onClick={handleExport} data-testid="export-report-button"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#c0172d] text-white hover:bg-[#a8142a] shadow-sm transition-colors shrink-0">
          <Download size={14} />Export {formats.find((f) => f.id === fmt)?.label}
        </button>
      </div>
      {exportError && <p className="text-sm text-[#c0172d]" role="alert" data-testid="export-error">{exportError}</p>}
    </div>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Stage meta Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface StageMeta { title: string; subtitle: string; fullWidth?: boolean; component: React.ComponentType<any>; }

const STAGE_META: Record<StageId, StageMeta> = {
  1: { title: "Initial Quality Review", subtitle: "Confirm TrackWise intake details and initialize the investigation package.", component: RapidStage },
  2: { title: "Evidence Library", subtitle: "Organize and upload all evidence required for the investigation.", component: EvidenceStage },
  3: { title: "Fact Review", subtitle: "Accept or reject extracted facts before generating the investigation draft.", component: FactsStage },
  4: { title: "Investigation", subtitle: "Review and edit the Draft investigation report sections.", component: InvestigationStage, fullWidth: true },
  5: { title: "Root Cause Analysis", subtitle: "Review causal factors, evidence linkage, and root cause classification.", component: RCAStage },
  6: { title: "Historical Review", subtitle: "Capture the TrackWise historical review summary and validation status.", component: HistoricalReviewWorkspaceStage, fullWidth: true },
  7: { title: "Risk Assessment", subtitle: "Assess severity and likelihood of recurrence with CAPA-style historical review and scientific rationale.", component: RiskAssessmentStagePanel, fullWidth: true },
  8: { title: "Resolution Planning", subtitle: "Structure corrections, corrective actions, preventive actions, and effectiveness planning by root cause.", component: ResolutionPlanStage },
  9: { title: "CAPA Draft", subtitle: "Review the deterministic CAPA bridge package built from content-ready resolution records.", component: CAPADraftStage },
  10: { title: "CAPA Level", subtitle: "Generate and review CAPA level assignments from the validated CAPA draft.", component: CAPALevelStage },
  11: { title: "Report Generation", subtitle: "Generate and download the final investigation report package.", component: ExportStage },
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ App shell Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export default function App() {
  const [showCaseSelect, setShowCaseSelect] = useState(true);
  const [showCaseSummary, setShowCaseSummary] = useState(false);
  const [selectedTrackwiseRecord, setSelectedTrackwiseRecord] = useState<TrackWiseRecord | null>(null);
  const [active, setActive] = useState<StageId>(2);
  const [completed, setCompleted] = useState<Set<StageId>>(new Set());
  const [caseId, setCaseId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceCase | null>(null);
  const [caseSummary, setCaseSummary] = useState<CaseSummaryView | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [caseSummaryLoading, setCaseSummaryLoading] = useState(false);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [workspaceNotice, setWorkspaceNotice] = useState<WorkspaceNotice>(null);
  const [caseSummaryNotice, setCaseSummaryNotice] = useState<WorkspaceNotice>(null);
  const [stageDraftSaveHandler, setStageDraftSaveHandler] = useState<(() => Promise<void>) | null>(null);

  const handleComplete = () => {
    setShowCaseSummary(false);
    setCompleted((p) => new Set([...p, active]));
    const next = STAGES.find((stage) => stage.id > active && isAuthorStageVisible(stage.id));
    if (next) setActive(next.id);
  };

  const exportActiveInvestigationPdf = () => {
    const error = openInvestigationPdf(workspace, caseId || undefined);
    if (error) {
      setWorkspaceNotice({ kind: "error", message: error });
      return;
    }
    handleComplete();
  };

  const refreshWorkspaceState = async (
    targetCaseId?: string | null,
    options?: { syncCompletedStages?: boolean },
  ): Promise<WorkspaceCase | null> => {
    const resolvedCaseId = targetCaseId || caseId;
    if (!resolvedCaseId) {
      return null;
    }
    setWorkspaceLoading(true);
    try {
      const nextWorkspace = await refreshWorkspaceApi(resolvedCaseId);
      console.log("=== WORKSPACE RECEIVED ===");
      console.log(nextWorkspace);
      console.log("workspace.rca =", nextWorkspace?.rca);
      console.log("workspace.rca.native", (nextWorkspace?.rca as any)?.native);
      console.log("root cause =", (nextWorkspace?.rca as any)?.root_cause?.statement);
      setWorkspace(nextWorkspace);
      if (options?.syncCompletedStages) {
        setCompleted(buildCompletedStages(nextWorkspace));
      }
      setWorkspaceNotice(null);
      return nextWorkspace;
    } catch (error) {
      setWorkspaceNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to load workspace.",
      });
      return null;
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const refreshCaseSummaryState = async (targetCaseId?: string | null): Promise<CaseSummaryView | null> => {
    const resolvedCaseId = targetCaseId || caseId;
    if (!resolvedCaseId) {
      return null;
    }
    setCaseSummaryLoading(true);
    try {
      const nextSummary = await loadCaseSummary(resolvedCaseId);
      setCaseSummary(nextSummary);
      setCaseSummaryNotice(null);
      return nextSummary;
    } catch (error) {
      setCaseSummaryNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to load case summary.",
      });
      return null;
    } finally {
      setCaseSummaryLoading(false);
    }
  };

  const enterWorkspace = async (nextCaseId: string, startStage: StageId = 2) => {
    setCaseId(nextCaseId);
    setShowCaseSelect(false);
    setShowCaseSummary(false);
    setActive(startStage);
    setCompleted(new Set());
    setWorkspace(null);
    setWorkspaceNotice(null);
    setCaseSummary(null);
    setCaseSummaryNotice(null);
    const nextWorkspace = await refreshWorkspaceState(nextCaseId, { syncCompletedStages: true });
    setActive(([...(STAGES.map((stage) => stage.id))].reverse().find((id) => id <= (inferStageFromWorkspace(nextWorkspace) || startStage) && isAuthorStageVisible(id)) || startStage) as StageId);
  };

  const selectRecord = async (record: TrackWiseRecord) => {
    const nextCaseId = `tw-${record.pr_id.toLowerCase()}`;
    setSelectedTrackwiseRecord(record);
    await enterWorkspace(nextCaseId, 1);
  };

  const openSavedCase = async (savedCaseId: string) => {
    setSelectedTrackwiseRecord(null);
    setCaseId(savedCaseId);
    setShowCaseSelect(false);
    setShowCaseSummary(true);
    setActive(1);
    setCompleted(new Set());
    setWorkspace(null);
    setWorkspaceNotice(null);
    setCaseSummary(null);
    setCaseSummaryNotice(null);
    const nextWorkspace = await refreshWorkspaceState(savedCaseId, { syncCompletedStages: true });
    setActive(([...(STAGES.map((stage) => stage.id))].reverse().find((id) => id <= (inferStageFromWorkspace(nextWorkspace) || 1) && isAuthorStageVisible(id)) || 1) as StageId);
  };

  const openStage = (stageId: StageId) => {
    if (!isAuthorStageVisible(stageId)) return;
    setShowCaseSummary(false);
    setActive(stageId);
  };

  useEffect(() => {
    if (!caseId || !showCaseSummary) {
      return;
    }

    void refreshCaseSummaryState(caseId);
  }, [caseId, showCaseSummary]);

  useEffect(() => {
    setStageDraftSaveHandler(null);
  }, [active, caseId, showCaseSummary]);

  useLayoutEffect(() => {
    if (!showCaseSelect) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [active, caseId, showCaseSelect, showCaseSummary]);

  const saveCurrentStageDraft = async () => {
    if (!caseId) {
      return;
    }
    if (stageDraftSaveHandler) {
      await stageDraftSaveHandler();
      return;
    }
    await saveCase(caseId);
  };

  const startNew = async () => {
    setSelectedTrackwiseRecord(null);
    const nextCaseId = `case-${Date.now()}`;
    await enterWorkspace(nextCaseId, 1);
    await saveCase(nextCaseId);
  };

  const openDemo = async () => {
    setSelectedTrackwiseRecord(null);
    await enterWorkspace(DEMO_CASE_ID, 1);
    setWorkspaceNotice({
      kind: "info",
      message: "Sample case loaded with synthetic data. The available workflow steps are ready for review.",
    });
  };

  if (showCaseSelect) {
    return (
      <CaseSelect
        onSelectRecord={selectRecord}
        onStartNew={startNew}
        onOpenSavedCase={openSavedCase}
        onOpenDemo={openDemo}
      />
    );
  }

  const initiationIds: StageId[] = [1, 2, 3];
  const initiationCount = initiationIds.filter((id) => completed.has(id)).length;
  const workflowStages = STAGES.filter((stage) => (stage.id === 1 || stage.id > 3) && isAuthorStageVisible(stage.id));
  const completedWorkflowCount = (initiationCount === 3 ? 1 : 0) + workflowStages.filter((stage) => stage.id > 3 && completed.has(stage.id)).length;
  const activeWorkflowStep = active <= 3 ? 1 : workflowStages.findIndex((stage) => stage.id === active) + 1;
  const activeMeta = STAGE_META[active];
  const Comp = activeMeta.component;
  const stageProps = {
    onComplete: handleComplete,
    workspace,
    caseId: caseId || "",
    refreshWorkspace: refreshWorkspaceState,
    isBusy: workspaceBusy,
    setBusy: setWorkspaceBusy,
    setNotice: setWorkspaceNotice,
    selectedTrackwiseRecord,
    registerStageDraftSave: setStageDraftSaveHandler,
  };
  const workspaceKey = caseId || "workspace";

  const intakeConfirmed = Boolean(
    workspace?.case_intake?.detailed_description?.trim()
    && workspace?.case_intake?.immediate_action_taken?.trim()
  );
  const canAccessStage = (_stageId: StageId) => true;

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f4f6]" style={{ fontFamily: "Inter,sans-serif" }}>

      {/* Header */}
      <header className="h-12 bg-[#14141a] flex items-center px-5 shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L12.2 7.4H18L13.4 10.8L15.2 16.2L10 12.8L4.8 16.2L6.6 10.8L2 7.4H7.8L10 2Z" fill="#c0172d" />
            </svg>
            <span className="text-white font-bold text-sm tracking-tight">CAPA<span className="text-[#c0172d]">.</span>AI</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#c0172d]/20 border border-[#c0172d]/40">
            <div className="w-4 h-4 rounded-full border border-[#c0172d] flex items-center justify-center">
              <span className="text-[8px] font-bold text-[#c0172d]">A</span>
            </div>
            <span className="text-[11px] font-bold text-[#c0172d] tracking-widest">AUTHOR</span>
          </div>
        </div>
        <div className="ml-6 flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-white/40 uppercase tracking-wider shrink-0">Case</span>
          <span className="text-[11px] text-white font-mono tracking-wide shrink-0">{WORKSPACE_LABEL}</span>
          <span className="text-white/20 mx-0.5">Ã‚Â·</span>
          <span className="text-[11px] text-white/50 truncate">{WORKSPACE_CONTEXT}</span>
        </div>
        <div className="flex-1" />
          <span className="mr-3 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white/70">
            Demo mode
          </span>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"><HelpCircle size={14} className="text-white/50" /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors relative">
            <Bell size={14} className="text-white/50" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#c0172d]" />
          </button>
          <div className="ml-2 flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-6 h-6 rounded-full bg-[#c0172d]/30 border border-[#c0172d]/50 flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#c0172d]">U1</span>
            </div>
            <div>
              <p className="text-[11px] font-medium text-white leading-none">user 1</p>
              <p className="text-[10px] text-white/40 leading-none mt-0.5">title A</p>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col sm:flex-row">

        {/* Sidebar */}
        <nav className="w-full sm:w-[196px] bg-white border-r border-[rgba(0,0,0,0.08)] flex flex-col shrink-0">
          <div className="px-4 pt-4 pb-3">
            <p className="text-[9px] font-bold text-[#b0b0bc] uppercase tracking-widest mb-1">Investigation</p>
            <p className="text-[11px] font-semibold text-[#111118] leading-snug">{WORKSPACE_HINT}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-[#e8e8ec] overflow-hidden">
                <div className="h-full rounded-full bg-[#c0172d] transition-all duration-500" style={{ width: `${(completedWorkflowCount / workflowStages.length) * 100}%` }} />
              </div>
              <span className="text-[9px] font-bold text-[#c0172d] shrink-0">{completedWorkflowCount}/{workflowStages.length}</span>
            </div>
          </div>

          <div className="h-px bg-[rgba(0,0,0,0.06)] mx-4 mb-2" />

          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
            <div className="px-2">
              <button
                type="button"
                data-testid="case-summary-nav"
                onClick={() => setShowCaseSummary(true)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${showCaseSummary ? "bg-[#fde8eb]" : "hover:bg-[#f4f4f6]"}`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors ${showCaseSummary ? "bg-[#c0172d] text-white" : "bg-[#e8e8ec] text-[#6b6b7a]"}`}>
                  <FileText size={10} strokeWidth={2.5} />
                </div>
                <span className={`text-[11px] font-medium leading-none ${showCaseSummary ? "text-[#c0172d]" : "text-[#111118]"}`}>
                  Case Summary
                </span>
                {showCaseSummary && <ChevronRight size={11} className="text-[#c0172d] ml-auto shrink-0" />}
              </button>
            </div>
            {STAGE_GROUPS.filter((grp) => (SHOW_ANALYSIS || grp.label !== "Analysis") && (SHOW_CLOSURE || grp.label !== "Closure")).map((grp) => (
              <div key={grp.label}>
                <p className="text-[9px] font-bold text-[#c8c8d0] uppercase tracking-widest px-2 mb-1.5">{grp.label}</p>
                <div className="space-y-0.5">
                  {grp.ids.map((id) => {
                    const cfg = STAGES.find((s) => s.id === id)!;
                    const isActive = !showCaseSummary && (id === 1 ? active <= 3 : id === active);
                    const isComplete = id === 1 ? initiationCount === 3 : completed.has(id);
                    return (
                      <button
                        key={id}
                        onClick={() => { if (canAccessStage(id)) openStage(id === 1 ? (active <= 3 ? active : (initiationIds.find((stage) => !completed.has(stage)) ?? 1)) : id); }}
                        data-testid={`stage-nav-${id}`}
                        aria-current={isActive ? "step" : undefined}
                        data-stage-state={isActive ? (isComplete ? "active-complete" : "active") : isComplete ? "complete" : "inactive"}
                        data-stage-completed={isComplete ? "true" : "false"}
                        disabled={!canAccessStage(id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${isActive ? "bg-[#fde8eb]" : canAccessStage(id) ? "hover:bg-[#f4f4f6]" : "opacity-50 cursor-not-allowed"
                          }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors ${isActive ? "bg-[#c0172d] text-white" : isComplete ? "bg-[#c0172d] text-white" : "bg-[#e8e8ec] text-[#6b6b7a]"}`}>
                          {isComplete ? <Check size={10} strokeWidth={3} /> : id === 1 ? 1 : workflowStages.findIndex((stage) => stage.id === id) + 1}
                        </div>
                        <span className={`text-[11px] font-medium leading-none ${isActive ? "text-[#c0172d]" : isComplete ? "text-[#111118]" : "text-[#6b6b7a]"}`}>
                          {id === 1 ? "Initiation" : cfg.label}
                        </span>
                        {id === 1 && <span className="ml-auto text-[10px] text-[#6b6b7a]" data-testid="initiation-sidebar-progress">{initiationCount}/3</span>}
                        {isActive && <ChevronRight size={11} className="text-[#c0172d] ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#f4f4f6]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <div>
                <p className="text-[10px] font-semibold text-[#111118]">Drafting Ready</p>
                <p className="text-[9px] text-[#6b6b7a]">Investigation Assistant</p>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0">
          {showCaseSummary ? (
            <div className="flex-1">
              <CaseSummaryPage
                caseId={caseId || ""}
                summary={caseSummary}
                workspace={workspace}
                loading={caseSummaryLoading}
                error={caseSummaryNotice?.message || null}
                onOpenStage={openStage}
                completedStages={completed}
                getStageLabel={(stageId) => STAGES.find((s) => s.id === stageId)?.label || `Stage ${stageId}`}
              />
            </div>
          ) : activeMeta.fullWidth ? (
            <>
              <div className="px-6 pt-4 pb-3 border-b border-[rgba(0,0,0,0.07)] shrink-0 bg-white">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] text-[#6b6b7a]">AUTHOR</span>
                  <ChevronRight size={10} className="text-[#6b6b7a]" />
                  <span className="text-[10px] text-[#6b6b7a]">{WORKSPACE_LABEL}</span>
                  <ChevronRight size={10} className="text-[#6b6b7a]" />
                  <span className="text-[10px] text-[#c0172d] font-medium">{activeMeta.title}</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#c0172d] uppercase tracking-widest">Step {activeWorkflowStep} of {workflowStages.length}</span>
                    <h1 className="text-lg font-semibold text-[#111118] mt-0.5">{activeMeta.title}</h1>
                  </div>
                  <p className="text-sm text-[#6b6b7a]">{activeMeta.subtitle}</p>
                </div>
                <div className="mt-3">
                  <WorkspaceStatusBanner notice={workspaceNotice} loading={workspaceLoading} />
                </div>
              </div>
              <div className="px-6 py-6">
                <Comp key={workspaceKey} {...stageProps} />
              </div>
            </>
          ) : (
            <div className="flex-1">
              <div className="w-full px-4 py-6 sm:px-6">
                <div className="flex items-center gap-1.5 mb-4">
                  <span className="text-[10px] text-[#6b6b7a]">AUTHOR</span>
                  <ChevronRight size={10} className="text-[#6b6b7a]" />
                  <span className="text-[10px] text-[#6b6b7a]">{WORKSPACE_LABEL}</span>
                  <ChevronRight size={10} className="text-[#6b6b7a]" />
                  <span className="text-[10px] text-[#c0172d] font-medium">{active <= 3 ? "Initiation" : activeMeta.title}</span>
                </div>
                <div className="mb-5">
                  <span className="text-[10px] font-bold text-[#c0172d] uppercase tracking-widest">Step {activeWorkflowStep} of {workflowStages.length}</span>
                  <h1 className="text-xl font-semibold text-[#111118] mt-0.5 mb-1">{active <= 3 ? "Initiation" : activeMeta.title}</h1>
                  <p className="text-sm text-[#6b6b7a]">{active <= 3 ? "Complete the initial review, add evidence, and review facts." : activeMeta.subtitle}</p>
                  {active <= 3 && <div className="mt-4 max-w-xs" data-testid="initiation-progress"><div className="flex justify-between text-xs font-semibold text-[#6b6b7a]"><span>Initiation progress</span><span>{initiationCount} of 3 complete</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8e8ec]" role="progressbar" aria-label="Initiation progress" aria-valuemin={0} aria-valuemax={3} aria-valuenow={initiationCount}><div className="h-full bg-[#c0172d]" style={{ width: `${initiationCount / 3 * 100}%` }} /></div></div>}
                </div>
                {active <= 3 && <div role="tablist" aria-label="Initiation sections" className="mb-5 flex flex-wrap gap-1 border-b border-[rgba(0,0,0,0.1)]">
                  {initiationIds.map((id) => <button key={id} type="button" role="tab" aria-selected={active === id} data-testid={`initiation-tab-${id}`} onClick={() => openStage(id)} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold ${active === id ? "border-[#c0172d] text-[#c0172d]" : "border-transparent text-[#6b6b7a] hover:text-[#111118]"}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full ${completed.has(id) ? "bg-emerald-100 text-emerald-700" : "bg-[#e8e8ec] text-[#6b6b7a]"}`}>{completed.has(id) ? <Check size={12} /> : id}</span>{STAGES.find((stage) => stage.id === id)?.label}<span className="font-normal">{completed.has(id) ? "Complete" : active === id ? "In progress" : "Pending"}</span></button>)}
                </div>}
                <div className="mb-4">
                  <WorkspaceStatusBanner notice={workspaceNotice} loading={workspaceLoading} />
                </div>
                <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-5 shadow-sm">
                  <Comp key={workspaceKey} {...stageProps} />
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          {!showCaseSummary && (
            <footer className="bg-white border-t border-[rgba(0,0,0,0.08)] flex items-center px-6 py-3 shrink-0 z-10">
              <div className="flex flex-wrap items-center gap-2.5 w-full">
                <button onClick={() => { const previous = [...STAGES].reverse().find((stage) => stage.id < active && isAuthorStageVisible(stage.id)); if (previous) openStage(previous.id); }} disabled={active === 1}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${active === 1 ? "text-[#b0b0bc] border-[rgba(0,0,0,0.06)] cursor-not-allowed" : "text-[#111118] border-[rgba(0,0,0,0.12)] hover:bg-[#f4f4f6]"}`}>
                  <ChevronLeft size={14} />Back
                </button>
                <button
                  onClick={() => void saveCurrentStageDraft()}
                  disabled={!caseId || workspaceBusy}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border border-[rgba(0,0,0,0.12)] text-[#111118] hover:bg-[#f4f4f6] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={13} />Save Draft
                </button>
                <div className="flex-1" />
                <div className="hidden sm:flex items-center gap-1 mr-4">
                  {workflowStages.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => { if (canAccessStage(s.id)) openStage(s.id === 1 ? (active <= 3 ? active : (initiationIds.find((stage) => !completed.has(stage)) ?? 1)) : s.id); }}
                      className={`rounded-full transition-all ${canAccessStage(s.id) ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                        } ${(s.id === 1 ? active <= 3 : s.id === active) ? "w-4 h-1.5 bg-[#c0172d]" : (s.id === 1 ? initiationCount === 3 : completed.has(s.id)) ? "w-1.5 h-1.5 bg-[#c0172d]/40" : "w-1.5 h-1.5 bg-[#e8e8ec]"}`}
                    />
                  ))}
                </div>
                {(active === 11 || active < 3 || workflowStages.some((stage) => stage.id > active)) && <button
                  onClick={active === 11 ? exportActiveInvestigationPdf : handleComplete}
                  disabled={active === 1 && !intakeConfirmed}
                  data-testid={active === 11 ? "footer-export-button" : "footer-continue-button"}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm ${active === 1 && !intakeConfirmed
                    ? "bg-[#e8e8ec] text-[#b0b0bc] cursor-not-allowed"
                    : "bg-[#c0172d] text-white hover:bg-[#a8142a]"
                    }`}
                >
                  {active === 11 ? <><Download size={14} />Export</> : <>Continue<ChevronRight size={14} /></>}
                </button>}
              </div>
            </footer>
          )}
        </main>
      </div>

      {/* GxP strip */}
      <div className="h-5 bg-[#fde8eb] border-t border-[#c0172d]/20 flex items-center justify-center shrink-0">
        <p className="text-[10px] font-bold text-[#c0172d] tracking-widest uppercase">NOT FOR GxP USE</p>
      </div>
    </div>
  );
}
