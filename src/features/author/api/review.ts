import { requestJson } from "./client"

export interface ReviewIssue {
  code: string
  message: string
  section_key?: string
  fact_ids?: string[]
  evidence_references?: string[]
  recommendation?: string
  severity?: string
  metadata?: Record<string, unknown>
}

export interface ReviewerResult {
  reviewer_id: string
  status: string
  score: number
  findings: ReviewIssue[]
  warnings: ReviewIssue[]
  blocking_issues: ReviewIssue[]
  metadata?: Record<string, unknown>
}

export interface InvestigationReviewReport {
  case_id: string
  review_gate: string
  overall_status: string
  overall_score: number
  section_scores: Record<string, number>
  findings: ReviewIssue[]
  warnings: ReviewIssue[]
  blocking_issues: ReviewIssue[]
  recommendations: string[]
  reviewer_results: ReviewerResult[]
  metadata?: Record<string, unknown>
}

export interface InvestigationReviewActionResponse {
  case_id: string
  review_gate: string
  context: Record<string, unknown>
  report: InvestigationReviewReport
  report_canonical: string
}

async function runReviewAction(caseId: string, action: string) {
  return requestJson<InvestigationReviewActionResponse>(`/case/${encodeURIComponent(caseId)}/action`, {
    method: "POST",
    body: JSON.stringify({
      action,
      payload: {},
    }),
  })
}

export function reviewExport(caseId: string) {
  return runReviewAction(caseId, "review_export")
}
