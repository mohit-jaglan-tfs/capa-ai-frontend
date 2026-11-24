// @ts-nocheck
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Info, RefreshCw, Save, Sparkles } from "lucide-react"
import { SHOW_CLOSURE } from "../config"

import {
  generateRiskAssessment,
  updateRiskAssessment,
  type RiskAssessment,
  type RiskAssessmentValidation,
  type RiskLikelihood,
  type RiskSeverity,
  type RiskAssessmentStatus,
  type WorkspaceCase,
} from "../api/workspace"

type StageNotice =
  | { kind: "success" | "error" | "info"; message: string }
  | null

interface RiskAssessmentStageProps {
  caseId: string
  workspace: WorkspaceCase | null
  refreshWorkspace: (caseId: string) => Promise<WorkspaceCase>
  isBusy: boolean
  setBusy: (busy: boolean) => void
  setNotice: (notice: StageNotice) => void
  onComplete: () => void
  registerStageDraftSave?: (handler: (() => Promise<void>) | null) => void
}

const SEVERITY_OPTIONS: Array<{ value: RiskSeverity; label: string; description: string }> = [
  { value: "unknown", label: "Unknown", description: "Insufficient evidence to rate severity yet." },
  { value: "low", label: "Low", description: "Limited quality, compliance, or patient impact." },
  { value: "moderate", label: "Moderate", description: "Noticeable impact that needs CAPA attention." },
  { value: "high", label: "High", description: "Strong quality or compliance impact." },
  { value: "critical", label: "Critical", description: "Serious patient, quality, or regulatory impact." },
]

const LIKELIHOOD_OPTIONS: Array<{ value: RiskLikelihood; label: string; description: string }> = [
  { value: "unknown", label: "Unknown", description: "Recurrence cannot yet be defended from the evidence." },
  { value: "low", label: "Low", description: "Controls or evidence suggest recurrence is unlikely." },
  { value: "moderate", label: "Moderate", description: "Some recurrence potential remains." },
  { value: "high", label: "High", description: "The issue appears likely to recur without action." },
  { value: "very_high", label: "Very High", description: "The pattern or controls strongly suggest repeat risk." },
]

function normalizeText(value: unknown): string {
  return String(value || "").trim()
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean)
  }
  const text = normalizeText(value)
  if (!text) {
    return []
  }
  return text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeRiskSeverity(value: unknown): RiskSeverity {
  const normalized = normalizeText(value).toLowerCase()
  if (["low", "moderate", "high", "critical"].includes(normalized)) {
    return normalized as RiskSeverity
  }
  return "unknown"
}

function normalizeRiskLikelihood(value: unknown): RiskLikelihood {
  const normalized = normalizeText(value).toLowerCase().replace(/\s+/g, "_")
  if (["low", "moderate", "high", "very_high"].includes(normalized)) {
    return normalized as RiskLikelihood
  }
  return "unknown"
}

function normalizeRiskStatus(value: unknown): RiskAssessmentStatus {
  const normalized = normalizeText(value).toLowerCase()
  if (["not_started", "draft", "ready_for_review", "approved"].includes(normalized)) {
    return normalized as RiskAssessmentStatus
  }
  return "not_started"
}

function normalizeRiskJudgment(value: unknown, fallback: RiskAssessment["risk_judgment"] | undefined, legacy: RiskAssessment | null | undefined) {
  const source = typeof value === "object" && value ? value : {}
  const legacySource = legacy || {}
  return {
    severity: normalizeRiskSeverity((source as Record<string, unknown>).severity ?? fallback?.severity ?? legacySource.severity),
    likelihood_of_recurrence: normalizeRiskLikelihood(
      (source as Record<string, unknown>).likelihood_of_recurrence ?? fallback?.likelihood_of_recurrence ?? legacySource.likelihood_of_recurrence,
    ),
    rationale: normalizeText((source as Record<string, unknown>).rationale ?? fallback?.rationale ?? legacySource.scientific_rationale),
    provisional: (source as Record<string, unknown>).provisional !== undefined
      ? Boolean((source as Record<string, unknown>).provisional)
      : fallback?.provisional !== undefined
        ? Boolean(fallback.provisional)
        : legacySource.provisional !== undefined
          ? Boolean(legacySource.provisional)
          : true,
    review_required: (source as Record<string, unknown>).review_required !== undefined
      ? Boolean((source as Record<string, unknown>).review_required)
      : fallback?.review_required !== undefined
        ? Boolean(fallback.review_required)
        : legacySource.review_required !== false,
  }
}

function normalizeHistoricalReviewSummary(
  value: unknown,
  legacy: RiskAssessment | null | undefined,
  sourceInputs: Record<string, unknown>,
) {
  const source = typeof value === "object" && value ? value : {}
  const legacyReview = typeof legacy?.historical_review === "object" && legacy.historical_review ? legacy.historical_review : {}
  const sourceHistorical = typeof sourceInputs.historical_review_summary === "object" && sourceInputs.historical_review_summary
    ? sourceInputs.historical_review_summary
    : {}

  return {
    summary: normalizeText((source as Record<string, unknown>).summary ?? legacyReview.summary ?? sourceHistorical.summary),
    impact_on_recurrence: normalizeText(
      (source as Record<string, unknown>).impact_on_recurrence
        ?? legacyReview.rationale
        ?? sourceHistorical.impact_on_risk
        ?? sourceHistorical.impact_on_rca,
    ),
    limitations: normalizeList((source as Record<string, unknown>).limitations ?? []),
    completion_needed: normalizeList((source as Record<string, unknown>).completion_needed ?? []),
  }
}

function normalizeTraceability(
  value: unknown,
  sourceInputs: Record<string, unknown>,
  sourceFactIds: string[],
  historicalReviewSummary: RiskAssessment["historical_review_summary"],
  stale: boolean,
) {
  const source = typeof value === "object" && value ? value : {}
  const historicalReviewPresent = Boolean(
    (source as Record<string, unknown>).historical_review_present
      ?? historicalReviewSummary?.summary
      ?? historicalReviewSummary?.impact_on_recurrence,
  ) || Boolean(historicalReviewSummary?.limitations?.length || historicalReviewSummary?.completion_needed?.length)
  return {
    model: normalizeText((source as Record<string, unknown>).model),
    prompt_version: normalizeText((source as Record<string, unknown>).prompt_version),
    generated_at: normalizeText((source as Record<string, unknown>).generated_at),
    source_fact_count: typeof (source as Record<string, unknown>).source_fact_count === "number"
      ? Number((source as Record<string, unknown>).source_fact_count)
      : sourceFactIds.length,
    source_fact_ids: normalizeList((source as Record<string, unknown>).source_fact_ids ?? sourceFactIds),
    historical_review_present: historicalReviewPresent,
    historical_review_status: (() => {
      const status = normalizeText((source as Record<string, unknown>).historical_review_status).toLowerCase().replace(/\s+/g, "_")
      if (["supported", "partial", "not_documented"].includes(status)) {
        return status as "supported" | "partial" | "not_documented"
      }
      return historicalReviewPresent ? "partial" : "not_documented"
    })(),
    stale: Boolean((source as Record<string, unknown>).stale ?? stale),
  }
}

function normalizeRiskAssessment(value: RiskAssessment | null | undefined, caseId = ""): RiskAssessment {
  const source = value || {}
  const historicalReview = typeof source.historical_review === "object" && source.historical_review ? source.historical_review : {}
  const impactScope = typeof source.impact_scope === "object" && source.impact_scope
    ? source.impact_scope
    : {}
  const sourceInputs = typeof source.source_inputs === "object" && source.source_inputs !== null ? { ...source.source_inputs } : {}
  const sourceFactIds = normalizeList(source.source_fact_ids)
  const investigatorSummary = normalizeText(source.investigator_summary || source.event_summary)
  const evidenceHighlights = normalizeList(source.evidence_highlights || source.objective_evidence_reviewed)
  const riskJudgment = normalizeRiskJudgment(source.risk_judgment, source.risk_judgment, source)
  const historicalReviewSummary = normalizeHistoricalReviewSummary(source.historical_review_summary, source, sourceInputs)
  const openGaps = normalizeList(source.open_gaps || source.gaps)
  const nextSteps = normalizeList(source.next_steps || source.recommended_next_steps)
  const humanReviewChecklist = normalizeList(source.human_review_checklist || source.human_review_notes)
  const traceability = normalizeTraceability(source.traceability, sourceInputs, sourceFactIds, historicalReviewSummary, Boolean(source.stale))

  return {
    case_id: normalizeText(source.case_id || caseId),
    status: normalizeRiskStatus(source.status),
    review_required: riskJudgment.review_required !== false,
    provisional: Boolean(riskJudgment.provisional),
    investigator_summary: investigatorSummary,
    evidence_highlights: evidenceHighlights,
    risk_judgment: riskJudgment,
    historical_review_summary: historicalReviewSummary,
    open_gaps: openGaps,
    next_steps: nextSteps,
    human_review_checklist: humanReviewChecklist,
    traceability,
    event_summary: investigatorSummary,
    impact_scope: {
      product: normalizeText(impactScope.product),
      process: normalizeText(impactScope.process),
      equipment: normalizeText(impactScope.equipment),
    },
    severity: riskJudgment.severity,
    likelihood_of_recurrence: riskJudgment.likelihood_of_recurrence,
    historical_review: {
      summary: normalizeText(historicalReviewSummary.summary || historicalReview.summary),
      search_criteria: normalizeText((sourceInputs.historical_review_summary as Record<string, unknown> | undefined)?.search_criteria || historicalReview.search_criteria),
      systems_searched: normalizeList((sourceInputs.historical_review_summary as Record<string, unknown> | undefined)?.systems_searched || historicalReview.systems_searched),
      records_reviewed: normalizeList((sourceInputs.historical_review_summary as Record<string, unknown> | undefined)?.records_reviewed || historicalReview.records_reviewed),
      rationale: normalizeText(historicalReviewSummary.impact_on_recurrence || historicalReview.rationale),
    },
    objective_evidence_reviewed: evidenceHighlights,
    scientific_rationale: normalizeText(riskJudgment.rationale || source.scientific_rationale),
    gaps: openGaps,
    recommended_next_steps: nextSteps,
    human_review_notes: humanReviewChecklist.join("\n"),
    source_fact_ids: sourceFactIds,
    source_inputs: sourceInputs,
    stale: Boolean(traceability.stale),
    raw_ai_draft: typeof source.raw_ai_draft === "object" && source.raw_ai_draft !== null
      ? { ...source.raw_ai_draft }
      : null,
    prompt_version: normalizeText(source.prompt_version) || undefined,
    model: normalizeText(source.model) || undefined,
    generator_version: normalizeText(source.generator_version) || undefined,
    generated_at: normalizeText(source.generated_at) || undefined,
  }
}

function normalizeRiskValidation(value: RiskAssessmentValidation | null | undefined): RiskAssessmentValidation {
  return {
    pass: Boolean(value?.pass),
    warnings: Array.isArray(value?.warnings) ? value!.warnings.map((item) => normalizeText(item)).filter(Boolean) : [],
    missing_fields: Array.isArray(value?.missing_fields) ? value!.missing_fields.map((item) => normalizeText(item)).filter(Boolean) : [],
    recommendations: Array.isArray(value?.recommendations) ? value!.recommendations.map((item) => normalizeText(item)).filter(Boolean) : [],
    status: normalizeRiskStatus(value?.status),
    stale: Boolean(value?.stale),
  }
}

function useAutoResizeTextarea(value: string, minHeight: number) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useLayoutEffect(() => {
    const textarea = ref.current
    if (!textarea) {
      return
    }

    textarea.style.height = "auto"
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`
  }, [minHeight, value])

  useEffect(() => {
    const textarea = ref.current
    if (!textarea || typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(() => {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`
    })

    observer.observe(textarea)
    return () => observer.disconnect()
  }, [minHeight])

  return ref
}

function AutoTextareaField({
  label,
  helper,
  value,
  placeholder,
  onChange,
  testId,
  minHeight = 128,
  rows = 4,
}: {
  label: string
  helper?: string
  value: string
  placeholder?: string
  onChange: (next: string) => void
  testId: string
  minHeight?: number
  rows?: number
}) {
  const ref = useAutoResizeTextarea(value, minHeight)

  return (
    <label className="block space-y-2.5" data-testid={`${testId}-field`}>
      <span className="block">
        <span className="block text-[13px] font-semibold text-[#111118]">{label}</span>
        {helper ? <span className="mt-0.5 block text-[10px] leading-4 text-[#6b6b7a]">{helper}</span> : null}
      </span>
      <textarea
        ref={ref}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{ minHeight }}
        className="w-full resize-none overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-4 text-[15px] leading-7 text-[#111118] focus:border-[#c0172d] focus:outline-none focus:ring-1 focus:ring-[#c0172d]"
        data-testid={`${testId}-textarea`}
      />
    </label>
  )
}

function TextField({
  label,
  helper,
  value,
  placeholder,
  onChange,
  testId,
}: {
  label: string
  helper?: string
  value: string
  placeholder?: string
  onChange: (next: string) => void
  testId: string
}) {
  return (
    <label className="block space-y-2.5" data-testid={`${testId}-field`}>
      <span className="block">
        <span className="block text-[13px] font-semibold text-[#111118]">{label}</span>
        {helper ? <span className="mt-0.5 block text-[10px] leading-4 text-[#6b6b7a]">{helper}</span> : null}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3.5 text-[14px] text-[#111118] focus:border-[#c0172d] focus:outline-none focus:ring-1 focus:ring-[#c0172d]"
        data-testid={`${testId}-input`}
      />
    </label>
  )
}

function SelectField({
  label,
  helper,
  value,
  options,
  onChange,
  testId,
}: {
  label: string
  helper?: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (next: string) => void
  testId: string
}) {
  return (
    <label className="block space-y-2.5" data-testid={`${testId}-field`}>
      <span className="block">
        <span className="block text-[13px] font-semibold text-[#111118]">{label}</span>
        {helper ? <span className="mt-0.5 block text-[10px] leading-4 text-[#6b6b7a]">{helper}</span> : null}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3.5 text-[14px] text-[#111118] focus:border-[#c0172d] focus:outline-none focus:ring-1 focus:ring-[#c0172d]"
        data-testid={`${testId}-select`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Badge({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const styles = {
    neutral: "bg-[#f1f1f4] text-[#111118]",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
    info: "bg-blue-50 text-blue-700",
  }[tone]

  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles}`}>{children}</span>
}

function StatusPill({
  children,
  tone = "neutral",
  solid = false,
}: {
  children: string
  tone?: "neutral" | "success" | "warning" | "danger" | "info"
  solid?: boolean
}) {
  const styles = {
    neutral: solid ? "bg-[#111118] text-white" : "bg-[#f1f1f4] text-[#111118]",
    success: solid ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700",
    warning: solid ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700",
    danger: solid ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700",
    info: solid ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700",
  }[tone]

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${styles}`}>
      {children}
    </span>
  )
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  eyebrow: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-[28px] border border-[rgba(0,0,0,0.08)] bg-white p-5 shadow-[0_1px_0_rgba(17,17,24,0.02)] ${className}`}>
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8c8c98]">{eyebrow}</p>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-[#111118]">{title}</h3>
          {description ? <p className="max-w-3xl text-sm leading-6 text-[#6b6b7a]">{description}</p> : null}
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  )
}

function scoreRiskLevel(severity: RiskSeverity, likelihood: RiskLikelihood): { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" } {
  if (severity === "unknown" || likelihood === "unknown") {
    return { label: "Provisional", tone: "info" }
  }

  const severityScore = { low: 1, moderate: 2, high: 3, critical: 4 }[severity] || 0
  const likelihoodScore = { low: 1, moderate: 2, high: 3, very_high: 4 }[likelihood] || 0
  const total = severityScore + likelihoodScore

  if (total <= 3) return { label: "Low", tone: "success" }
  if (total <= 5) return { label: "Moderate", tone: "warning" }
  if (total <= 6) return { label: "High", tone: "danger" }
  return { label: "Very High", tone: "danger" }
}

function splitRows(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function RiskAssessmentStage({
  caseId,
  workspace,
  refreshWorkspace,
  isBusy,
  setBusy,
  setNotice,
  onComplete,
  registerStageDraftSave,
}: RiskAssessmentStageProps) {
  const storedAssessment = workspace?.risk_assessment || null
  const [draft, setDraft] = useState<RiskAssessment>(() => normalizeRiskAssessment(storedAssessment, caseId))

  useEffect(() => {
    setDraft(normalizeRiskAssessment(storedAssessment, caseId))
  }, [caseId, storedAssessment])

  const validation = useMemo(
    () => normalizeRiskValidation(workspace?.risk_assessment_validation || null),
    [workspace?.risk_assessment_validation],
  )
  const canContinue = validation.pass && !validation.stale && draft.review_required

  const riskLevel = scoreRiskLevel(draft.severity, draft.likelihood_of_recurrence)
  const sourceInputs = (draft.source_inputs || {}) as Record<string, unknown>
  const acceptedFacts = Array.isArray(sourceInputs.accepted_facts) ? sourceInputs.accepted_facts : []
  const historicalReviewSummaryInputs = (sourceInputs.historical_review_summary || {}) as Record<string, unknown>
  const riskJudgment = (draft.risk_judgment || {}) as Record<string, unknown>
  const historicalReviewSummary = (draft.historical_review_summary || {}) as Record<string, unknown>
  const traceability = (draft.traceability || {}) as Record<string, unknown>
  const statusLabel = isBusy
    ? "Generating"
    : validation.stale
      ? "Needs Review"
      : validation.pass
        ? "Fresh"
        : "Needs Review"
  const statusTone = isBusy
    ? "info"
    : validation.stale
      ? "warning"
      : validation.pass
        ? "success"
        : "warning"
  const reviewLabel = draft.review_required ? "Human Review Required" : "Review Complete"
  const reviewTone = draft.review_required ? "warning" : "success"

  const updateField = <K extends keyof RiskAssessment>(field: K, nextValue: RiskAssessment[K]) => {
    setDraft((current) => ({ ...current, [field]: nextValue }))
  }

  const updateImpactField = <K extends keyof NonNullable<RiskAssessment["impact_scope"]>>(field: K, nextValue: string) => {
    setDraft((current) => ({
      ...current,
      impact_scope: {
        ...(current.impact_scope || {}),
        [field]: nextValue,
      },
    }))
  }

  const updateInvestigatorSummaryField = (nextValue: string) => {
    setDraft((current) => ({
      ...current,
      investigator_summary: nextValue,
      event_summary: nextValue,
    }))
  }

  const updateRiskJudgmentField = (
    field: keyof NonNullable<RiskAssessment["risk_judgment"]>,
    nextValue: any,
  ) => {
    setDraft((current) => {
      const nextRiskJudgment = {
        ...(current.risk_judgment || {}),
        [field]: nextValue,
      }
      const nextDraft: RiskAssessment = {
        ...current,
        risk_judgment: nextRiskJudgment,
      }
      if (field === "severity") {
        nextDraft.severity = nextValue as RiskSeverity
      }
      if (field === "likelihood_of_recurrence") {
        nextDraft.likelihood_of_recurrence = nextValue as RiskLikelihood
      }
      if (field === "rationale") {
        nextDraft.scientific_rationale = String(nextValue || "")
      }
      if (field === "provisional") {
        nextDraft.provisional = Boolean(nextValue)
      }
      if (field === "review_required") {
        nextDraft.review_required = Boolean(nextValue)
      }
      return nextDraft
    })
  }

  const updateHistoricalReviewSummaryField = (
    field: keyof NonNullable<RiskAssessment["historical_review_summary"]>,
    nextValue: any,
  ) => {
    setDraft((current) => {
      const nextHistoricalReviewSummary = {
        ...(current.historical_review_summary || {}),
        [field]: nextValue,
      }
      const nextDraft: RiskAssessment = {
        ...current,
        historical_review_summary: nextHistoricalReviewSummary,
      }
      if (field === "summary") {
        nextDraft.historical_review = {
          ...(current.historical_review || {}),
          summary: String(nextValue || ""),
        }
      }
      if (field === "impact_on_recurrence") {
        nextDraft.historical_review = {
          ...(current.historical_review || {}),
          rationale: String(nextValue || ""),
        }
      }
      return nextDraft
    })
  }

  const updateMultilineListField = (
    field: "objective_evidence_reviewed" | "evidence_highlights" | "gaps" | "open_gaps" | "recommended_next_steps" | "next_steps" | "human_review_checklist" | "source_fact_ids",
    value: string,
  ) => {
    const rows = splitRows(value)
    setDraft((current) => {
      const nextDraft: RiskAssessment = {
        ...current,
        [field]: rows as never,
      }
      if (field === "evidence_highlights") {
        nextDraft.objective_evidence_reviewed = rows
      }
      if (field === "open_gaps") {
        nextDraft.gaps = rows
        nextDraft.open_gaps = rows
      }
      if (field === "recommended_next_steps") {
        nextDraft.next_steps = rows
        nextDraft.recommended_next_steps = rows
      }
      if (field === "next_steps") {
        nextDraft.recommended_next_steps = rows
        nextDraft.next_steps = rows
      }
      if (field === "human_review_checklist") {
        nextDraft.human_review_notes = rows.join("\n")
        nextDraft.human_review_checklist = rows
      }
      if (field === "gaps") {
        nextDraft.open_gaps = rows
        nextDraft.gaps = rows
      }
      if (field === "objective_evidence_reviewed") {
        nextDraft.evidence_highlights = rows
        nextDraft.objective_evidence_reviewed = rows
      }
      return nextDraft
    })
  }

  const persistRiskAssessment = async (
    riskAssessment: RiskAssessment,
    noticeMessage: string,
    advanceStage = false,
    allowWhileBusy = false,
  ) => {
    if (!caseId || (isBusy && !allowWhileBusy)) {
      return
    }

    setBusy(true)
    try {
      const nextWorkspace = await updateRiskAssessment(caseId, riskAssessment)
      setDraft(normalizeRiskAssessment(nextWorkspace.risk_assessment || riskAssessment, caseId))
      await refreshWorkspace(caseId)
      setNotice({
        kind: "success",
        message: noticeMessage,
      })
      if (advanceStage) {
        onComplete()
      }
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to save risk assessment.",
      })
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = async () => {
    await persistRiskAssessment(
      {
        ...draft,
        status: normalizeRiskStatus(draft.status),
      },
      "Risk assessment saved.",
    )
  }

  const saveAndContinue = async () => {
    if (!canContinue) {
      setNotice({
        kind: "error",
        message: validation.stale
          ? "Regenerate the risk assessment before continuing because upstream facts changed."
          : "Complete the required risk assessment fields and keep human review enabled before continuing.",
      })
      return
    }
    await persistRiskAssessment(
      {
        ...draft,
        status: "ready_for_review",
        review_required: true,
        risk_judgment: {
          ...(draft.risk_judgment || {}),
          review_required: true,
        },
      },
      "Risk assessment saved.",
      true,
    )
  }

  const generateAssessment = async () => {
    if (!caseId || isBusy) {
      return
    }

    setBusy(true)
    try {
      const response = await generateRiskAssessment(caseId)
      const generated = normalizeRiskAssessment(response.risk_assessment, caseId)
      setDraft(generated)
      await persistRiskAssessment(generated, "Risk assessment generated and saved.", false, true)
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to generate the risk assessment.",
      })
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!registerStageDraftSave) {
      return
    }
    registerStageDraftSave(() => saveDraft)
    return () => {
      registerStageDraftSave(null)
    }
  }, [registerStageDraftSave, saveDraft])

  return (
    <div className="w-full space-y-6" data-testid="risk-assessment-section">
      <div className="rounded-[28px] border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-sm" data-testid="risk-assessment-editor">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={statusTone} solid>
                {statusLabel}
              </StatusPill>
              <StatusPill tone={draft.provisional ? "info" : "neutral"}>
                {draft.provisional ? "Provisional" : "Conservative"}
              </StatusPill>
              <StatusPill tone={reviewTone}>
                {reviewLabel}
              </StatusPill>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8c8c98]">Risk Assessment</p>
              <h2 className="text-2xl font-semibold text-[#111118]">Guided workflow</h2>
              <p className="max-w-4xl text-sm leading-7 text-[#4b4b58]">
                Assess severity and recurrence with persisted historical review, objective evidence, and a human-reviewed CAPA mindset.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f8f8fa] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Risk Level</p>
              <p className="mt-2 text-lg font-semibold text-[#111118]">{riskLevel.label} Risk</p>
              <p className="mt-1 text-xs leading-5 text-[#6b6b7a]">
                Severity {String(riskJudgment.severity || draft.severity || "unknown")} · Likelihood {String(riskJudgment.likelihood_of_recurrence || draft.likelihood_of_recurrence || "unknown")}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f8f8fa] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Review State</p>
              <p className="mt-2 text-lg font-semibold text-[#111118]">{validation.stale ? "Stale" : validation.pass ? "Fresh" : "Needs Review"}</p>
              <p className="mt-1 text-xs leading-5 text-[#6b6b7a]">
                {validation.stale
                  ? "Regenerate to reflect current upstream facts."
                  : draft.review_required
                    ? "Human review remains required."
                    : "Human review satisfied."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <SectionCard
            eyebrow="1. Event Summary"
            title="Event Summary"
            description="Capture the event and impacted scope in a clear, factual narrative."
          >
            <AutoTextareaField
              label="Event Summary"
              helper="Describe the event in plain language and make the hazard clear."
              value={normalizeText(draft.investigator_summary || draft.event_summary)}
              onChange={(value) => updateInvestigatorSummaryField(value)}
              placeholder="Summarize the event..."
              testId="risk-assessment-event-summary"
              minHeight={156}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <TextField
                label="Impacted Product"
                helper="Product or family affected by the event."
                value={draft.impact_scope?.product || ""}
                onChange={(value) => updateImpactField("product", value)}
                placeholder="Product"
                testId="risk-assessment-impact-product"
              />
              <TextField
                label="Impacted Process"
                helper="Process step or operation involved."
                value={draft.impact_scope?.process || ""}
                onChange={(value) => updateImpactField("process", value)}
                placeholder="Process"
                testId="risk-assessment-impact-process"
              />
              <TextField
                label="Impacted Equipment"
                helper="Equipment, line, or system involved."
                value={draft.impact_scope?.equipment || ""}
                onChange={(value) => updateImpactField("equipment", value)}
                placeholder="Equipment"
                testId="risk-assessment-impact-equipment"
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="2. Evidence Supporting Assessment"
            title="Evidence Supporting Assessment"
            description="Capture the strongest evidence and the basis for the rating."
          >
            <AutoTextareaField
              label="Evidence Highlights"
              helper="One short item per line."
              value={(draft.evidence_highlights || []).join("\n")}
              onChange={(value) => updateMultilineListField("evidence_highlights", value)}
              placeholder="Enter evidence highlights..."
              testId="risk-assessment-evidence-highlights"
              minHeight={152}
            />
            <AutoTextareaField
              label="Assessment Rationale"
              helper="Explain the CAPA-style basis for the risk judgment."
              value={normalizeText(riskJudgment.rationale || draft.scientific_rationale)}
              onChange={(value) => updateRiskJudgmentField("rationale", value)}
              placeholder="Explain the rationale..."
              testId="risk-assessment-assessment-rationale"
              minHeight={168}
            />
          </SectionCard>

          <SectionCard
            eyebrow="3. Risk Assessment"
            title="Risk Assessment"
            description="Rate severity and recurrence likelihood using the current evidence and historical review."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#8c8c98]">Severity</p>
                <div className="space-y-2.5">
                  {SEVERITY_OPTIONS.map((option) => {
                    const selected = draft.severity === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateRiskJudgmentField("severity", option.value)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selected ? "border-[#c0172d] bg-[#fff5f6]" : "border-[rgba(0,0,0,0.08)] bg-white hover:bg-[#fafafa]"}`}
                      >
                        <span className="block text-[14px] font-semibold text-[#111118]">{option.label}</span>
                        <span className="mt-0.5 block text-[10px] leading-4 text-[#6b6b7a]">{option.description}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#8c8c98]">Likelihood of Recurrence</p>
                <div className="space-y-2.5">
                  {LIKELIHOOD_OPTIONS.map((option) => {
                    const selected = draft.likelihood_of_recurrence === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateRiskJudgmentField("likelihood_of_recurrence", option.value)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selected ? "border-[#c0172d] bg-[#fff5f6]" : "border-[rgba(0,0,0,0.08)] bg-white hover:bg-[#fafafa]"}`}
                      >
                        <span className="block text-[14px] font-semibold text-[#111118]">{option.label}</span>
                        <span className="mt-0.5 block text-[10px] leading-4 text-[#6b6b7a]">{option.description}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={riskLevel.tone}>{riskLevel.label} Risk</Badge>
              <span className="text-[11px] text-[#6b6b7a]">
                Keep the assessment conservative and anchored to objective evidence.
              </span>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="4. Historical Review"
            title="Historical Review"
            description="Summarize the saved review once and show how it affects recurrence thinking."
          >
            <AutoTextareaField
              label="Summary"
              helper="Summarize the saved review in plain language."
              value={normalizeText(historicalReviewSummary.summary || historicalReviewSummaryInputs.summary || draft.historical_review?.summary || "")}
              onChange={(value) => updateHistoricalReviewSummaryField("summary", value)}
              placeholder="Summarize the historical review..."
              testId="risk-assessment-historical-summary"
              minHeight={136}
            />
            <AutoTextareaField
              label="Impact on Recurrence"
              helper="Explain how the review changes the recurrence judgment."
              value={normalizeText(
                historicalReviewSummary.impact_on_recurrence
                || historicalReviewSummaryInputs.impact_on_risk
                || historicalReviewSummaryInputs.impact_on_rca
                || draft.historical_review?.rationale
                || "",
              )}
              onChange={(value) => updateHistoricalReviewSummaryField("impact_on_recurrence", value)}
              placeholder="Explain the impact on recurrence..."
              testId="risk-assessment-historical-impact"
              minHeight={136}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <AutoTextareaField
                label="Limitations"
                helper="List missing history or limitations once."
                value={(historicalReviewSummary.limitations || []).join("\n")}
                onChange={(value) => updateHistoricalReviewSummaryField("limitations", splitRows(value))}
                placeholder="Enter limitations..."
                testId="risk-assessment-historical-limitations"
                minHeight={108}
                rows={3}
              />
              <AutoTextareaField
                label="Completion Needed"
                helper="List what still needs to be completed."
                value={(historicalReviewSummary.completion_needed || []).join("\n")}
                onChange={(value) => updateHistoricalReviewSummaryField("completion_needed", splitRows(value))}
                placeholder="Enter completion items..."
                testId="risk-assessment-historical-completion-needed"
                minHeight={108}
                rows={3}
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="5. Open Gaps"
            title="Open Gaps"
            description="Capture what remains unknown or not fully supported."
          >
            <AutoTextareaField
              label="Open Gaps"
              helper="One gap per line."
              value={(draft.open_gaps || []).join("\n")}
              onChange={(value) => updateMultilineListField("open_gaps", value)}
              placeholder="Enter open gaps..."
              testId="risk-assessment-open-gaps"
              minHeight={132}
            />
          </SectionCard>

          <SectionCard
            eyebrow="6. Recommended Next Steps"
            title="Recommended Next Steps"
            description="List the next factual investigative or verification actions."
          >
            <AutoTextareaField
              label="Next Steps"
              helper="One next step per line."
              value={(draft.next_steps || []).join("\n")}
              onChange={(value) => updateMultilineListField("next_steps", value)}
              placeholder="Enter next steps..."
              testId="risk-assessment-next-steps"
              minHeight={132}
            />
          </SectionCard>

          <SectionCard
            eyebrow="7. Human Review"
            title="Human Review"
            description="Keep the draft editable until a reviewer has checked the checklist and accepted the state."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label="Assessment Status"
                helper="Move the assessment from draft to ready for review when a human has checked it."
                value={draft.status}
                onChange={(value) => updateField("status", normalizeRiskStatus(value))}
                options={[
                  { value: "not_started", label: "Not Started" },
                  { value: "draft", label: "Draft" },
                  { value: "ready_for_review", label: "Ready for Review" },
                  { value: "approved", label: "Approved" },
                ]}
                testId="risk-assessment-status"
              />
              <SelectField
                label="Review Required"
                helper="Human review remains required even when the Draft looks complete."
                value={draft.review_required ? "true" : "false"}
                onChange={(value) => updateRiskJudgmentField("review_required", value === "true")}
                options={[
                  { value: "true", label: "Yes" },
                  { value: "false", label: "No" },
                ]}
                testId="risk-assessment-review-required"
              />
              <div className="md:col-span-2">
                <AutoTextareaField
                  label="Human Review Checklist"
                  helper="One checklist item per line."
                  value={(draft.human_review_checklist || []).join("\n")}
                  onChange={(value) => updateMultilineListField("human_review_checklist", value)}
                  placeholder="Enter review checklist items..."
                  testId="risk-assessment-human-review-checklist"
                  minHeight={132}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4 xl:col-span-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto xl:pr-1 self-start">
          <section className="rounded-[28px] border border-[rgba(0,0,0,0.08)] bg-[#f8f8fa] p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-[#6b6b7a]" />
              <p className="text-sm font-semibold text-[#111118]">Traceability</p>
            </div>
            <div className="mt-4 space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Source Facts</p>
                  <p className="mt-1 text-[#111118]">
                    {traceability.source_fact_count || draft.source_fact_ids?.length
                      ? `${traceability.source_fact_count || draft.source_fact_ids?.length} accepted facts`
                      : "No accepted facts captured yet."}
                  </p>
                  {draft.source_fact_ids?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {draft.source_fact_ids.map((factId) => (
                        <Badge key={factId}>{factId}</Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Model / Prompt</p>
                  <p className="mt-1 text-[#111118]">{traceability.model || draft.model || "Model not recorded yet."}</p>
                  <p className="mt-1 text-[11px] text-[#6b6b7a]">
                    Prompt: {traceability.prompt_version || draft.prompt_version || "n/a"} · Generated: {traceability.generated_at || draft.generated_at || "n/a"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Historical Review</p>
                  <p className="mt-1 text-[#111118]">
                    {traceability.historical_review_present
                      ? (traceability.historical_review_status === "supported" ? "Documented and supported." : "Documented with limitations.")
                      : "Not documented yet."}
                  </p>
                  <p className="mt-1 text-[11px] text-[#6b6b7a]">
                    {traceability.historical_review_present
                      ? "Saved summary is used as the historical input for this draft."
                      : "Add a saved historical review summary before final approval."}
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Freshness</p>
                  <p className="mt-1 text-[#111118]">{traceability.stale ? "Stale" : "Fresh"}</p>
                  <p className="mt-1 text-[11px] text-[#6b6b7a]">
                    {traceability.stale
                      ? "Upstream facts changed after generation."
                      : "No upstream change has invalidated the draft."}
                  </p>
                </div>
              </div>

              <details className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4" data-testid="risk-assessment-traceability-details">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-[#6b6b7a]">Traceability details</summary>
                <div className="mt-3 space-y-2 text-[11px] leading-5 text-[#6b6b7a]">
                  <p>Source fact count: {traceability.source_fact_count ?? draft.source_fact_ids?.length ?? 0}</p>
                  <p>Source fact ids: {(traceability.source_fact_ids || draft.source_fact_ids || []).join(", ") || "n/a"}</p>
                  <p>Historical review status: {traceability.historical_review_status || "not_documented"}</p>
                </div>
                <pre className="mt-3 max-h-56 overflow-auto rounded-2xl bg-[#f8f8fa] p-3 text-[11px] leading-5 text-[#111118] whitespace-pre-wrap break-words">
                  {JSON.stringify(
                    {
                      case_id: draft.case_id || caseId,
                      source_fact_count: traceability.source_fact_count || draft.source_fact_ids?.length || 0,
                      source_fact_ids: traceability.source_fact_ids || draft.source_fact_ids || [],
                      historical_review_status: traceability.historical_review_status || "not_documented",
                      stale: traceability.stale,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </div>
          </section>

          <section className="rounded-[28px] border border-[rgba(0,0,0,0.08)] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Validation</p>
                <p className="mt-1 text-sm font-semibold text-[#111118]">
                  {validation.stale ? "Stale draft requires review" : validation.pass ? "Validation passed" : "Validation needs attention"}
                </p>
              </div>
              {validation.pass && !validation.stale ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-amber-600" />}
            </div>
            <div className="mt-3 space-y-3 text-[11px] text-[#6b6b7a]">
              {validation.missing_fields.length > 0 && (
                <div>
                  <p className="font-semibold text-[#111118]">Missing</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {validation.missing_fields.slice(0, 6).map((field) => <li key={field}>{field}</li>)}
                  </ul>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div>
                  <p className="font-semibold text-[#111118]">Warnings</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {validation.warnings.slice(0, 6).map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </div>
              )}
              {validation.recommendations.length > 0 && (
                <div>
                  <p className="font-semibold text-[#111118]">Recommendations</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {validation.recommendations.slice(0, 6).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <details className="rounded-[28px] border border-[rgba(0,0,0,0.08)] bg-[#fcfcfd] p-5 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-[#111118]">Raw Draft</summary>
            <p className="mt-2 text-[11px] leading-5 text-[#6b6b7a]">Collapsed by default so the workflow stays focused on the editable draft.</p>
            <pre className="mt-3 max-h-80 overflow-auto rounded-2xl bg-[#111118] p-3 text-[11px] leading-5 text-[#f4f4f6]">
              {JSON.stringify(draft.raw_ai_draft || {}, null, 2)}
            </pre>
          </details>

          <section className="rounded-[28px] border border-[rgba(0,0,0,0.08)] bg-[#111118] p-5 text-white shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-white/70" />
              <p className="text-sm font-semibold">Review actions</p>
            </div>
            <p className="mt-2 text-xs leading-6 text-white/70">
              Generate the draft from accepted facts, then edit and save the assessment before moving on.
            </p>
            <div className="mt-4 grid gap-2.5">
              <button
                type="button"
                onClick={() => void generateAssessment()}
                disabled={isBusy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#111118] hover:bg-[#f2f2f4] disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="generate-risk-assessment-button"
              >
                {isBusy ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isBusy ? "Generating" : "Generate Risk Assessment"}
              </button>
              <button
                type="button"
                onClick={() => void saveDraft()}
                disabled={isBusy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-transparent px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="risk-assessment-save-draft-button"
              >
                <Save size={14} />
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => void saveAndContinue()}
                disabled={isBusy || !canContinue}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#c0172d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#a8142a] disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="risk-assessment-save-and-continue-button"
              >
                <Save size={14} />
                {SHOW_CLOSURE ? "Save and Continue" : "Save and Complete"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
