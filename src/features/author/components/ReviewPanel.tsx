import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, RefreshCw, Shield, Sparkles } from "lucide-react"
import type { InvestigationReviewActionResponse, ReviewIssue, ReviewerResult } from "../api/review"

type ReviewPanelProps = {
  caseId: string
  reviewGate: string
  title: string
  description: string
  buttonLabel: string
  onReview: (caseId: string) => Promise<InvestigationReviewActionResponse>
  testIdPrefix: string
}

function summarizeIssue(issue: ReviewIssue) {
  const parts = [issue.message, issue.recommendation].filter(Boolean)
  return parts.join(" ")
}

function IssueList({ title, items, emptyLabel, testId }: { title: string; items: ReviewIssue[]; emptyLabel: string; testId: string }) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4" data-testid={testId}>
      <p className="text-[10px] font-bold text-[#6b6b7a] uppercase tracking-wider">{title}</p>
      <div className="mt-2 space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-[#6b6b7a]">{emptyLabel}</p>
        ) : (
          items.map((issue, index) => (
            <div key={`${issue.code}-${index}`} className="rounded-lg border border-[rgba(0,0,0,0.07)] bg-[#fafafa] px-3 py-2">
              <p className="text-xs font-semibold text-[#111118]">{issue.code}</p>
              <p className="mt-1 text-xs text-[#6b6b7a] leading-relaxed">{summarizeIssue(issue)}</p>
              {issue.fact_ids && issue.fact_ids.length > 0 && (
                <p className="mt-1 text-[11px] text-[#6b6b7a]">Facts: {issue.fact_ids.join(", ")}</p>
              )}
              {issue.section_key && (
                <p className="mt-1 text-[11px] text-[#6b6b7a]">Section: {issue.section_key}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ReviewerCard({ reviewer }: { reviewer: ReviewerResult }) {
  const statusClass =
    reviewer.status === "blocked"
      ? "bg-[#fde8eb] text-[#c0172d] border-[#c0172d]/15"
      : reviewer.status === "warn"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-emerald-50 text-emerald-700 border-emerald-100"

  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#111118]">{reviewer.reviewer_id}</p>
          <p className="mt-0.5 text-[11px] text-[#6b6b7a]">Reviewer status and score</p>
        </div>
        <div className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${statusClass}`}>
          {reviewer.status}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#6b6b7a]">
        <div className="rounded-lg bg-[#f9f9fb] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider">Score</p>
          <p className="mt-0.5 text-sm font-semibold text-[#111118]">{reviewer.score}</p>
        </div>
        <div className="rounded-lg bg-[#f9f9fb] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider">Findings</p>
          <p className="mt-0.5 text-sm font-semibold text-[#111118]">{reviewer.findings.length}</p>
        </div>
      </div>
    </div>
  )
}

export function ReviewPanel({
  caseId,
  reviewGate,
  title,
  description,
  buttonLabel,
  onReview,
  testIdPrefix,
}: ReviewPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<InvestigationReviewActionResponse | null>(null)
  const [completedAt, setCompletedAt] = useState<string | null>(null)

  const report = response?.report || null
  const reviewers = useMemo(() => report?.reviewer_results || [], [report])

  const runReview = async () => {
    if (loading || !caseId) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const next = await onReview(caseId)
      setResponse(next)
      setCompletedAt(new Date().toLocaleTimeString())
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Review failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f9f9fb] p-4" data-testid={`${testIdPrefix}-panel`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fde8eb] text-[#c0172d]">
          <Shield size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6b7a]">Read-only review gate</p>
          <h3 className="mt-1 text-sm font-semibold text-[#111118]">{title}</h3>
          <p className="mt-1 text-xs text-[#6b6b7a] leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-[#6b6b7a] flex items-center gap-1">
          <Sparkles size={10} className="text-[#c0172d]" />
          Uses the generic case action route and does not save case state.
        </p>
        <button
          type="button"
          onClick={() => void runReview()}
          disabled={loading}
          data-testid={`${testIdPrefix}-run-button`}
          className="flex items-center gap-2 rounded-xl bg-[#c0172d] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#a8142a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          {buttonLabel}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700" data-testid={`${testIdPrefix}-error`}>
          {error}
        </div>
      )}

      {report && (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" data-testid={`${testIdPrefix}-success-banner`}>
          Review completed with status {report.overall_status} and score {report.overall_score}.{completedAt ? ` Last updated at ${completedAt}.` : ""}
        </div>
      )}

      {report && (
        <div className="mt-4 space-y-3" data-testid={`${testIdPrefix}-report`}>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Overall Status</p>
              <p className="mt-1 text-sm font-semibold text-[#111118]" data-testid={`${testIdPrefix}-overall-status`}>
                {report.overall_status}
              </p>
            </div>
            <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Overall Score</p>
              <p className="mt-1 text-sm font-semibold text-[#111118]" data-testid={`${testIdPrefix}-overall-score`}>
                {report.overall_score}
              </p>
            </div>
            <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Review Gate</p>
              <p className="mt-1 text-sm font-semibold text-[#111118]">{reviewGate}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Reviewer Results</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3" data-testid={`${testIdPrefix}-reviewer-results`}>
              {reviewers.map((reviewer) => (
                <ReviewerCard key={reviewer.reviewer_id} reviewer={reviewer} />
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <IssueList
              title="Findings"
              items={report.findings}
              emptyLabel="No findings recorded."
              testId={`${testIdPrefix}-findings`}
            />
            <IssueList
              title="Warnings"
              items={report.warnings}
              emptyLabel="No warnings recorded."
              testId={`${testIdPrefix}-warnings`}
            />
            <IssueList
              title="Blocking Issues"
              items={report.blocking_issues}
              emptyLabel="No blocking issues recorded."
              testId={`${testIdPrefix}-blocking-issues`}
            />
          </div>

          {report.recommendations.length > 0 && (
            <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4" data-testid={`${testIdPrefix}-recommendations`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b6b7a]">Recommendations</p>
              <div className="mt-2 space-y-2">
                {report.recommendations.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-start gap-2 rounded-lg bg-[#f9f9fb] px-3 py-2">
                    <AlertTriangle size={12} className="mt-0.5 text-amber-600 shrink-0" />
                    <p className="text-xs text-[#111118] leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
