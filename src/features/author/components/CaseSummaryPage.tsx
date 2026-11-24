import { ArrowRight, AlertCircle, CheckCircle2, ChevronRight, Info } from "lucide-react"
import { SHOW_CLOSURE, isAuthorStageVisible } from "../config"
import type { CaseSummaryView, WorkspaceCase } from "../api/workspace"

type CaseSummaryPageProps = {
  caseId: string
  summary: CaseSummaryView | null
  workspace: WorkspaceCase | null
  loading: boolean
  error: string | null
  onOpenStage: (stageId: number) => void
  getStageLabel: (stageId: number) => string
  completedStages: ReadonlySet<number>
}

function statusTone(status: string) {
  const normalized = String(status || "").trim().toLowerCase()
  if (["approved", "ready_for_review", "reviewed", "complete", "completed", "not_required", "already_completed"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-100"
  }
  if (["draft", "required"].includes(normalized)) {
    return "bg-amber-50 text-amber-700 border-amber-100"
  }
  if (["not_started", "not_available"].includes(normalized)) {
    return "bg-slate-100 text-slate-600 border-slate-200"
  }
  return "bg-blue-50 text-blue-700 border-blue-100"
}

function badgeLabel(status: string) {
  const normalized = String(status || "").trim().toLowerCase()
  if (normalized === "not_available") return "No validation"
  return normalized.replace(/_/g, " ")
}

export function CaseSummaryPage({
  caseId,
  summary,
  workspace,
  loading,
  error,
  onOpenStage,
  getStageLabel,
  completedStages,
}: CaseSummaryPageProps) {
  const sections = (summary?.sections || []).filter((section) => isAuthorStageVisible(section.stage_id))
  const initiationSections = sections.filter((section) => section.stage_id >= 1 && section.stage_id <= 3)
  const laterSections = sections.filter((section) => section.stage_id < 1 || section.stage_id > 3)
  const initiationComplete = [1, 2, 3].filter((id) => completedStages.has(id)).length
  const attentionVisible = !summary?.attention_stage_id || isAuthorStageVisible(summary.attention_stage_id)
  const attention = attentionVisible ? (summary?.attention_stage_title || "Pending review") : "No active attention stage"
  const overallStatus = summary?.overall_status || "not_started"
  const evidenceCount = (workspace?.evidence || []).length
  const acceptedFacts = (workspace?.facts?.accepted || []).length
  const resolutionRecords = (workspace?.resolution_plan?.resolution_records || []).length
  const capaDraftRecords = (workspace?.capa_draft?.records || []).length

  return (
    <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,#fff7f8_0%,#f4f4f6_55%,#eef0f4_100%)]">
      <div className="w-full px-4 py-6 space-y-6 sm:px-6" data-testid="case-summary-page">
        <section className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white/90 backdrop-blur shadow-sm p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#6b6b7a]">
                <span>AUTHOR</span>
                <ChevronRight size={10} />
                <span>Case Summary</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#c0172d] uppercase tracking-[0.2em]">Read-only case spine</p>
                <h1 className="mt-2 text-3xl font-semibold text-[#111118]">Case Summary</h1>
                <p className="mt-2 max-w-3xl text-sm text-[#6b6b7a]">
                  A single control room view stitched from persisted case data. Use it to understand what happened,
                  what is complete, what is blocked, and where to go next.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Case", value: caseId },
                { label: "Overall status", value: overallStatus },
                { label: "Attention", value: attention },
                { label: "Evidence", value: String(evidenceCount) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#111118]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            {[
              { label: "Accepted facts", value: acceptedFacts },
              ...(SHOW_CLOSURE ? [{ label: "Resolution records", value: resolutionRecords },
              { label: "CAPA draft records", value: capaDraftRecords }] : []),
              { label: "Steps tracked", value: laterSections.length + (initiationSections.length ? 1 : 0) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">{item.label}</p>
                <p className="mt-1 text-lg font-semibold text-[#111118]">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {loading && !summary && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Loading persisted case summary...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="relative pl-6">
          <div className="absolute left-[12px] top-2 bottom-2 w-px bg-[linear-gradient(to_bottom,rgba(192,23,45,0.3),rgba(0,0,0,0.06))]" />
          <div className="space-y-4" data-testid="case-summary-spine">
            {initiationSections.length > 0 && (
              <article className="relative rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white shadow-sm p-5" data-testid="case-summary-initiation">
                <div className="absolute -left-[22px] top-6 h-5 w-5 rounded-full border-2 border-white bg-[#c0172d] shadow-sm" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-[#6b6b7a]">01</span><h2 className="text-lg font-semibold text-[#111118]">Initiation</h2></div>
                  <span className="text-xs font-semibold text-[#6b6b7a]" data-testid="case-summary-initiation-progress">{initiationComplete} of 3 complete</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8e8ec]" role="progressbar" aria-label="Initiation progress" aria-valuemin={0} aria-valuemax={3} aria-valuenow={initiationComplete}><div className="h-full bg-[#c0172d]" style={{ width: `${initiationComplete / 3 * 100}%` }} /></div>
                <div className="mt-4 space-y-3">
                  {initiationSections.map((section) => (
                    <div key={section.key} className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-4" data-testid={`case-summary-section-${section.key}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-[#111118]">{section.title}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${completedStages.has(section.stage_id) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{completedStages.has(section.stage_id) ? "Complete" : "Pending"}</span></div><button type="button" onClick={() => onOpenStage(section.edit_stage_id ?? section.stage_id)} data-testid={`case-summary-section-${section.key}-open-stage`} className="inline-flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f4f4f6]">Open {getStageLabel(section.edit_stage_id ?? section.stage_id)} <ArrowRight size={14} /></button></div>
                      <p className="mt-2 text-sm text-[#555562]">{section.summary}</p>
                      <p className="mt-1 text-xs text-[#6b6b7a]">Status: {badgeLabel(section.status || "not_started")} · Validation: {badgeLabel(section.validation_status || "not_available")}</p>
                      {section.missing_fields?.length > 0 && <p className="mt-2 text-xs text-[#6b6b7a]">Missing fields: {section.missing_fields.join(", ")}</p>}
                      {section.blockers?.map((item) => <p key={item} className="mt-1 text-xs text-amber-700">Blocker: {item}</p>)}
                      {section.warnings?.map((item) => <p key={item} className="mt-1 text-xs text-[#6b6b7a]">Warning: {item}</p>)}
                      {section.recommendations?.map((item) => <p key={item} className="mt-1 text-xs text-[#6b6b7a]">Recommendation: {item}</p>)}
                    </div>
                  ))}
                </div>
              </article>
            )}
            {laterSections.map((section, index) => {
              const targetStageId = section.edit_stage_id ?? section.stage_id
              const openStageLabel = getStageLabel(targetStageId)
              const hasBlockers = (section.blockers || []).length > 0
              const validationLabel = badgeLabel(section.validation_status || "not_available")
              return (
                <article
                  key={section.key}
                  className="relative rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white shadow-sm p-5"
                  data-testid={`case-summary-section-${section.key}`}
                >
                  <div className="absolute -left-[22px] top-6 h-5 w-5 rounded-full border-2 border-white bg-[#c0172d] shadow-sm" />
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">
                          {String(index + (initiationSections.length ? 2 : 1)).padStart(2, "0")}
                        </p>
                        <h2 className="text-lg font-semibold text-[#111118]">{section.title}</h2>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusTone(section.status)}`}
                          data-testid={`case-summary-section-${section.key}-status`}
                        >
                          {String(section.status || "not_started").replace(/_/g, " ")}
                        </span>
                        <span
                          className="inline-flex items-center rounded-full border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#6b6b7a]"
                          data-testid={`case-summary-section-${section.key}-validation`}
                        >
                          {validationLabel}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-[#111118]" data-testid={`case-summary-section-${section.key}-summary`}>
                        {section.summary}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenStage(targetStageId)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[rgba(0,0,0,0.12)] bg-white px-4 py-2 text-sm font-semibold text-[#111118] transition-colors hover:bg-[#f4f4f6]"
                      data-testid={`case-summary-section-${section.key}-open-stage`}
                    >
                      Open {openStageLabel}
                      <ArrowRight size={14} />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Missing fields</p>
                      <div className="mt-2 flex flex-wrap gap-2" data-testid={`case-summary-section-${section.key}-missing`}>
                        {section.missing_fields?.length ? section.missing_fields.map((field) => (
                          <span key={field} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#111118] border border-[rgba(0,0,0,0.08)]">
                            {field}
                          </span>
                        )) : (
                          <span className="text-sm text-emerald-700">None</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Blockers</p>
                      <div className="mt-2 space-y-2" data-testid={`case-summary-section-${section.key}-blockers`}>
                        {hasBlockers ? section.blockers.map((blocker) => (
                          <div key={blocker} className="flex items-start gap-2 text-sm text-[#111118]">
                            <AlertCircle size={14} className="mt-0.5 text-amber-600 shrink-0" />
                            <span>{blocker}</span>
                          </div>
                        )) : (
                          <div className="flex items-center gap-2 text-sm text-emerald-700">
                            <CheckCircle2 size={14} />
                            <span>No blockers recorded.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Warnings and recommendations</p>
                      <div className="mt-2 space-y-2">
                        {(section.warnings || []).length ? (
                          <div className="text-sm text-[#111118]">
                            <p className="font-semibold text-[#6b6b7a]">Warnings</p>
                            <ul className="mt-1 space-y-1">
                              {section.warnings.map((warning) => <li key={warning}>• {warning}</li>)}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-sm text-[#6b6b7a]">No warnings recorded.</p>
                        )}
                        {(section.recommendations || []).length ? (
                          <div className="text-sm text-[#111118]">
                            <p className="font-semibold text-[#6b6b7a]">Recommendations</p>
                            <ul className="mt-1 space-y-1">
                              {section.recommendations.map((recommendation) => <li key={recommendation}>• {recommendation}</li>)}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#111118]">
            <Info size={15} className="text-[#c0172d]" />
            What needs attention now
          </div>
          <div className="mt-3 rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-4" data-testid="case-summary-next-step">
            <p className="text-sm font-semibold text-[#111118]">{attention}</p>
            <p className="mt-1 text-sm text-[#6b6b7a]">{attentionVisible ? (summary?.attention_summary || "All tracked sections are complete.") : "No attention item is shown for the available steps."}</p>
          </div>
        </section>
      </div>
    </div>
  )
}
