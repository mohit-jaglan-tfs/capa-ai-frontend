// @ts-nocheck
import { requestJson } from "./client"

export type RcaMethodId = "brainstorming" | "five_whys"
export type ResolutionDecision = "required" | "not_required"
export type ResolutionStatus = "not_started" | "draft" | "ready_for_review" | "approved"
export type RiskAssessmentStatus = ResolutionStatus
export type RiskSeverity = "unknown" | "low" | "moderate" | "high" | "critical"
export type RiskLikelihood = "unknown" | "low" | "moderate" | "high" | "very_high"

export type WorkspaceFactStatus = "pending" | "accepted" | "rejected"

export interface WorkspaceEvidence {
  evidence_id: string
  evidence_title: string
  source_data?: string
  source_type?: string
  source_name?: string
  source_field?: string
  source_reference?: string
  source_location?: string
  category?: string
  status?: string
  note?: string
  bytes?: number
  mime_type?: string
}

export interface WorkspaceFact {
  fact_id: string
  statement: string
  category?: string
  confidence?: number
  entities?: string[]
  source_type?: string
  source_name?: string
  source_field?: string
  source_reference?: string
  evidence_id?: string
  evidence_title?: string
  source_excerpt?: string
  source_location?: string
  provenance?: Array<{
    source_type?: string
    source_name?: string
    source_field?: string
    source_reference?: string
    source_location?: string
    evidence_id?: string
    evidence_title?: string
    source_excerpt?: string
  }>
  status?: WorkspaceFactStatus
}

export interface HistoricalEvent {
  record_id?: string
  title?: string
  similarity?: string
  summary?: string
  resolution?: string
  repeat_issue?: string
  comments?: string
}

export interface HistoricalReviewSelectionReference {
  selection_batch_id?: string | null
  selected_record_count?: number
  selected_at?: string | null
  selected_by?: string | null
}

export interface HistoricalReviewSelectedRecordsOutput {
  selection_batch_id?: string | null
  count?: number
  records?: HistoricalReviewSelectedRecord[]
}

export interface HistoricalReviewRecordEvaluation {
  record_id?: string
  classification?: "related_repeat" | "related_non_repeat" | "not_related" | "unclear_needs_review"
  rationale?: string | null
  evidence_used?: string[]
  confidence?: "low" | "medium" | "high"
  review_required?: boolean
  evaluated_at?: string | null
  model?: string | null
  prompt_version?: string | null
}

export interface HistoricalReviewSelectedRecord {
  pr_id: string
  date_opened?: string | null
  date_closed?: string | null
  tw_v_initial_criticality?: string | null
  tw_v_site?: string | null
  tw_v_responsible_department?: string | null
  tw_v_dr_type?: string | null
  detailed_description?: string | null
  investigation?: string | null
  conclusion?: string | null
  record_type?: string | null
  search_type?: string | null
  match_reason?: string | null
}

export interface HistoricalReview {
  source?: "TrackWise"
  status?: "not_started" | "draft" | "completed" | "reviewed"
  search_criteria_draft?: HistoricalSearchCriteriaDraft | null
  search_criteria?: string | null
  timeframe?: string | null
  date_opened_from?: string | null
  date_opened_to?: string | null
  date_closed_from?: string | null
  date_closed_to?: string | null
  systems_searched?: string[]
  records_reviewed?: number | null
  similar_events?: HistoricalEvent[]
  summary?: string | null
  impact_on_investigation?: string | null
  impact_on_risk?: string | null
  impact_on_rca?: string | null
  recommendations?: string[]
  attachments?: string[]
  confidence?: "low" | "medium" | "high"
  review_notes?: string[]
  record_evaluations?: HistoricalReviewRecordEvaluation[]
  selected_records_ref?: HistoricalReviewSelectionReference | null
  selected_records_output?: HistoricalReviewSelectedRecordsOutput | null
  selected_records?: HistoricalReviewSelectedRecord[]
}

export interface HistoricalSearchCriteriaTimeframe {
  start?: string | null
  end?: string | null
  rationale?: string | null
}

export interface HistoricalSearchCriteriaTerms {
  required?: string[]
  optional?: string[]
  exclude?: string[]
}

export interface HistoricalSearchCriteriaScope {
  site?: string | null
  product?: string | null
  equipment?: string | null
  process?: string | null
  department?: string | null
}

export interface HistoricalSearchCriteriaDraft {
  objective?: string | null
  event_summary?: string | null
  recommended_systems?: string[]
  timeframe?: HistoricalSearchCriteriaTimeframe
  search_terms?: HistoricalSearchCriteriaTerms
  scope?: HistoricalSearchCriteriaScope
  rationale?: string | null
  limitations?: string[]
  confidence?: "low" | "medium" | "high"
  review_required?: boolean
  source_fact_ids?: string[]
  raw_ai_draft?: Record<string, unknown> | null
  prompt_version?: string | null
  model?: string | null
  generator_version?: string | null
  generated_at?: string | null
}

export interface RiskAssessmentImpactScope {
  product?: string
  process?: string
  equipment?: string
}

export interface RiskAssessmentRiskJudgment {
  severity?: RiskSeverity
  likelihood_of_recurrence?: RiskLikelihood
  rationale?: string
  provisional?: boolean
  review_required?: boolean
}

export interface RiskAssessmentHistoricalReviewSummary {
  summary?: string
  impact_on_recurrence?: string
  limitations?: string[]
  completion_needed?: string[]
}

export interface RiskAssessmentTraceability {
  model?: string
  prompt_version?: string
  generated_at?: string
  source_fact_count?: number
  source_fact_ids?: string[]
  historical_review_present?: boolean
  historical_review_status?: "supported" | "partial" | "not_documented"
  stale?: boolean
}

export interface RiskAssessmentHistoricalReview {
  summary?: string
  search_criteria?: string
  systems_searched?: string[]
  records_reviewed?: string[]
  rationale?: string
}

export interface RiskAssessment {
  case_id?: string
  status?: RiskAssessmentStatus
  review_required?: boolean
  provisional?: boolean
  investigator_summary?: string
  evidence_highlights?: string[]
  risk_judgment?: RiskAssessmentRiskJudgment
  historical_review_summary?: RiskAssessmentHistoricalReviewSummary
  open_gaps?: string[]
  next_steps?: string[]
  human_review_checklist?: string[]
  traceability?: RiskAssessmentTraceability
  event_summary?: string
  impact_scope?: RiskAssessmentImpactScope
  severity?: RiskSeverity
  likelihood_of_recurrence?: RiskLikelihood
  historical_review?: RiskAssessmentHistoricalReview
  objective_evidence_reviewed?: string[]
  scientific_rationale?: string
  gaps?: string[]
  recommended_next_steps?: string[]
  human_review_notes?: string
  source_fact_ids?: string[]
  source_inputs?: Record<string, unknown>
  stale?: boolean
  raw_ai_draft?: Record<string, unknown> | null
  prompt_version?: string | null
  model?: string | null
  generator_version?: string | null
  generated_at?: string | null
}

export interface RiskAssessmentValidation {
  pass: boolean
  warnings: string[]
  missing_fields: string[]
  recommendations: string[]
  status: RiskAssessmentStatus
  stale?: boolean
}

export interface RiskAssessmentGenerationResponse {
  risk_assessment: RiskAssessment
}

export interface HistoricalReviewSearchRecord {
  pr_id: string | number
  date_opened?: string | null
  date_closed?: string | null
  tw_v_initial_criticality?: string | null
  tw_v_site?: string | null
  tw_v_responsible_department?: string | null
  tw_v_dr_type?: string | null
  detailed_description?: string | null
  investigation?: string | null
  conclusion?: string | null
  record_type?: string | null
  search_type?: string | null
  match_reason?: string | null
}

export interface HistoricalReviewSearchPage {
  records: HistoricalReviewSearchRecord[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface HistoricalReviewFilterOptions {
  sites: string[]
  criticalities: string[]
  departments: string[]
}

export interface HistoricalReviewSearchInput {
  date_opened_from?: string | null
  date_opened_to?: string | null
  date_closed_from?: string | null
  date_closed_to?: string | null
  keywords?: string[]
  site?: string | null
  initial_criticality?: string | null
  responsible_department?: string | null
  page?: number
  page_size?: number
}

export interface HistoricalSearchCriteriaGenerationResponse {
  search_criteria_draft: HistoricalSearchCriteriaDraft
}

export interface HistoricalReviewRecordEvaluationsResponse {
  case_id?: string
  evaluations?: HistoricalReviewRecordEvaluation[]
}

export interface Correction {
  id?: string
  decision?: ResolutionDecision
  justification?: string | null
  impacted_items?: string[]
  actions?: string[]
  owner?: string | null
  due_date?: string | null
  objective_evidence?: string[]
  acceptance_criteria?: string[]
  status?: ResolutionStatus
}

export interface CorrectiveAction {
  id?: string
  decision?: ResolutionDecision
  justification?: string | null
  linked_root_causes?: string[]
  linked_causal_factors?: string[]
  owner?: string | null
  due_date?: string | null
  implementation_plan?: string[]
  expected_outcome?: string | null
  status?: ResolutionStatus
}

export interface PreventiveAction {
  id?: string
  decision?: ResolutionDecision
  justification?: string | null
  linked_root_causes?: string[]
  linked_causal_factors?: string[]
  owner?: string | null
  due_date?: string | null
  implementation_plan?: string[]
  expected_outcome?: string | null
  status?: ResolutionStatus
}

export interface EffectivenessPlan {
  required?: boolean
  goal?: string | null
  method?: string | null
  data_source?: string | null
  analysis_method?: string | null
  sample_size?: string | null
  duration?: string | null
  owner?: string | null
  success_criteria?: string[]
  adverse_effect_review?: string | null
  status?: ResolutionStatus
}

export interface ResolutionRecord {
  root_cause_id?: string
  root_cause_statement?: string
  correction?: Correction
  corrective_action?: CorrectiveAction
  preventive_action?: PreventiveAction
  effectiveness_plan?: EffectivenessPlan
  review_notes?: string[]
  status?: ResolutionStatus
}

export interface ResolutionAlignment {
  root_cause_id?: string
  pass: boolean
  warnings: string[]
  missing_fields: string[]
  recommendations: string[]
  correction_alignment: ResolutionStatus
  corrective_action_alignment: ResolutionStatus
  preventive_action_alignment: ResolutionStatus
  effectiveness_alignment: ResolutionStatus
  overall_status: ResolutionStatus
}

export interface ResolutionPlan {
  status?: ResolutionStatus
  resolution_records?: ResolutionRecord[]
  review_notes?: string[]
  metadata?: Record<string, unknown>
}

export interface CAPAActionDraft {
  id?: string
  decision?: ResolutionDecision
  justification?: string | null
  statement?: string | null
  owner?: string | null
  due_date?: string | null
  objective_evidence?: string[]
  acceptance_criteria?: string[]
  implementation_plan?: string[]
  expected_outcome?: string | null
  status?: ResolutionStatus
}

export interface CAPAEffectivenessDraft {
  required?: boolean
  goal?: string | null
  method?: string | null
  data_source?: string | null
  analysis_method?: string | null
  sample_size?: string | null
  duration?: string | null
  owner?: string | null
  success_criteria?: string[]
  adverse_effect_review?: string | null
  status?: ResolutionStatus
}

export interface CAPADraftRecord {
  root_cause_id?: string
  correction_draft?: CAPAActionDraft
  corrective_action_draft?: CAPAActionDraft
  preventive_action_draft?: CAPAActionDraft
  effectiveness_draft?: CAPAEffectivenessDraft
  alignment_status?: ResolutionStatus
  missing_fields?: string[]
  warnings?: string[]
  ready_for_review?: boolean
}

export interface CAPADraft {
  case_id: string
  status?: ResolutionStatus
  source_resolution_record_ids?: string[]
  records?: CAPADraftRecord[]
  summary?: string | null
  missing_fields?: string[]
  warnings?: string[]
  ready_for_review?: boolean
  review_notes?: string[]
  metadata?: Record<string, unknown>
}

export interface CAPALevelEvidence {
  source_text?: string
  source_type?: string
  source_ref?: string
  matched_rule?: string
  notes?: string
}

export interface CAPALevelAssignment {
  target_id?: string
  target_type?: "correction_draft" | "corrective_action_draft" | "preventive_action_draft" | "effectiveness_draft"
  assigned_level?: "level_1" | "level_2" | "level_3" | "level_4" | "level_5" | "unassigned"
  assigned_category?: "elimination" | "replacement" | "human_factor_design" | "procedure" | "training" | "other" | "detection" | "mitigation" | "unassigned"
  rationale?: string
  evidence_refs?: string[]
  confidence?: "low" | "medium" | "high"
  warnings?: string[]
  status?: ResolutionStatus
  evidence?: CAPALevelEvidence[]
}

export interface CAPALevelSummary {
  case_id: string
  status?: ResolutionStatus
  assignments?: CAPALevelAssignment[]
  summary?: string
  warnings?: string[]
  missing_fields?: string[]
  ready_for_review?: boolean
}

export interface CAPALevelMismatch {
  field_name?: string
  mismatch_type?: string
  severity?: "info" | "warning" | "critical"
  expected_value?: string | null
  actual_value?: string | null
  details?: string | null
}

export interface CAPALevelRecordReview {
  record_id?: string
  root_cause_id?: string
  passed?: boolean
  assigned_level?: "level_1" | "level_2" | "level_3" | "level_4" | "level_5" | "unassigned"
  assigned_category?: "elimination" | "replacement" | "human_factor_design" | "procedure" | "training" | "other" | "detection" | "mitigation" | "unassigned"
  review_result?: "pass" | "review" | "fail"
  confidence?: "low" | "medium" | "high"
  mismatches?: CAPALevelMismatch[]
  warnings?: string[]
  recommendations?: string[]
  ready_for_review?: boolean
  status?: ResolutionStatus
  review_notes?: string[]
  metadata?: Record<string, unknown>
}

export interface CAPALevelReview {
  case_id?: string
  status?: ResolutionStatus
  overall_pass?: boolean
  overall_ready?: boolean
  record_reviews?: CAPALevelRecordReview[]
  warnings?: string[]
  recommendations?: string[]
  summary?: string
  ready_for_review?: boolean
  review_notes?: string[]
  metadata?: Record<string, unknown>
}

export interface CAPALevelReviewValidation {
  pass: boolean
  warnings: string[]
  missing_fields: string[]
  recommendations: string[]
  status: ResolutionStatus
}

export interface WorkspaceFactsLedger {
  proposed: WorkspaceFact[]
  accepted: WorkspaceFact[]
  rejected: WorkspaceFact[]
}

export interface WorkspaceCase {
  case_id: string
  evidence: WorkspaceEvidence[]
  facts: WorkspaceFactsLedger
  case_intake?: {
    pr_id: string
    rapid_status?: "required" | "not_required" | "already_completed"
    metadata?: Record<string, unknown>
    detailed_description?: string
    immediate_action_taken?: string
    trackwise_record?: Record<string, unknown>
  } | null
  rapid?: unknown
  investigation?: unknown
  sequence_of_events?: unknown
  background_information?: unknown
  data_and_evidence_collection?: unknown
  error_classification?: unknown
  health_hazard_assessment?: unknown
  impact_assessment?: unknown
  historical_review?: HistoricalReview
  historical_review_validation?: {
    pass: boolean
    warnings: string[]
    missing_fields: string[]
    recommendations: string[]
    status: "not_started" | "draft" | "completed" | "reviewed"
  }
  risk_assessment?: RiskAssessment
  risk_assessment_validation?: RiskAssessmentValidation
  resolution_plan?: ResolutionPlan
  resolution_plan_validation?: {
    pass: boolean
    warnings: string[]
    missing_fields: string[]
    recommendations: string[]
    status: ResolutionStatus
  }
  resolution_alignment?: {
    pass: boolean
    warnings: string[]
    missing_fields: string[]
    recommendations: string[]
    alignments: ResolutionAlignment[]
    overall_status: ResolutionStatus
    readiness_for_downstream_capa_drafting: boolean
  }
  capa_draft?: CAPADraft
  capa_draft_validation?: {
    pass: boolean
    warnings: string[]
    missing_fields: string[]
    recommendations: string[]
    status: ResolutionStatus
  }
  capa_level_review?: CAPALevelReview
  capa_level_review_validation?: CAPALevelReviewValidation
  capa_level_summary?: CAPALevelSummary
  capa_level_validation?: {
    pass: boolean
    warnings: string[]
    missing_fields: string[]
    recommendations: string[]
    status: ResolutionStatus
  }
  investigation_summary?: unknown
  potential_causes?: unknown
  root_cause?: unknown
  rapid_rubric?: unknown
  rca?: unknown
  capa?: unknown
  conclusion?: unknown
}

export interface CaseSummarySection {
  key: string
  title: string
  stage_id: number
  edit_stage_id?: number | null
  status: string
  validation_status?: string
  summary: string
  missing_fields: string[]
  blockers: string[]
  warnings: string[]
  recommendations: string[]
}

export interface CaseSummaryView {
  case_id: string
  overall_status: string
  attention_stage_id?: number | null
  attention_stage_title?: string
  attention_summary?: string
  sections: CaseSummarySection[]
  summary_notes?: string[]
}

export interface SavedCaseSummary {
  case_id: string
  updated_at: string
  evidence_count: number
}

export interface RenameCaseInput {
  case_id: string
}

export interface UploadEvidenceInput {
  evidence_title: string
  source_data: string
  source_type?: string
  source_name?: string
  source_field?: string
  source_reference?: string
  source_location?: string
  category?: string
  note?: string
  bytes?: number
  mime_type?: string
  status?: string
}

export interface ExtractFactsInput {
  source_type?: string
  source_data?: string
  structured_context?: Record<string, unknown>
}

export interface CaseIntakeInput {
  pr_id: string
  metadata?: Record<string, unknown>
  detailed_description?: string
  immediate_action_taken?: string
  rapid_status?: "required" | "not_required" | "already_completed"
  record?: Record<string, unknown>
}

interface CaseActionRequest {
  action: string
  payload?: Record<string, unknown>
}

interface HistoricalReviewRequest {
  historical_review: HistoricalReview
}

async function runCaseAction<T>(caseId: string, action: string, payload: Record<string, unknown> = {}) {
  return requestJson<T>(`/case/${encodeURIComponent(caseId)}/action`, {
    method: "POST",
    body: JSON.stringify({ action, payload } satisfies CaseActionRequest),
  })
}

export function loadWorkspace(caseId: string) {
  return requestJson<WorkspaceCase>(`/case/${encodeURIComponent(caseId)}`)
}

export function loadCaseSummary(caseId: string) {
  return requestJson<CaseSummaryView>(`/case/${encodeURIComponent(caseId)}/summary`)
}

export function listSavedCases() {
  return requestJson<{ cases: SavedCaseSummary[] }>("/cases")
}

export function renameSavedCase(caseId: string, nextCaseId: string) {
  return requestJson<WorkspaceCase>(`/case/${encodeURIComponent(caseId)}/rename`, {
    method: "POST",
    body: JSON.stringify({ case_id: nextCaseId } satisfies RenameCaseInput),
  })
}

export function deleteSavedCase(caseId: string) {
  return requestJson<{ deleted: boolean; case_id: string }>(`/case/${encodeURIComponent(caseId)}`, {
    method: "DELETE",
  })
}

export function refreshWorkspace(caseId: string) {
  return loadWorkspace(caseId)
}

export function saveCase(caseId: string) {
  return runCaseAction<WorkspaceCase>(caseId, "save_case", {})
}

export function uploadEvidence(caseId: string, evidenceItems: UploadEvidenceInput[]) {
  return runCaseAction<WorkspaceCase>(caseId, "upload_evidence", {
    evidence_items: evidenceItems,
  })
}

export function extractFacts(caseId: string, payload: ExtractFactsInput = {}) {
  return runCaseAction<WorkspaceCase>(caseId, "extract_facts", payload)
}

export function setCaseIntake(caseId: string, payload: CaseIntakeInput) {
  return runCaseAction<WorkspaceCase>(caseId, "set_case_intake", payload)
}


export function generateInvestigation(caseId: string) {
  return runCaseAction<WorkspaceCase>(caseId, "generate_investigation", {})
}

export function updateHistoricalReview(caseId: string, historicalReview: HistoricalReview) {
  return runCaseAction<WorkspaceCase>(caseId, "update_historical_review", {
    historical_review: historicalReview,
  } satisfies HistoricalReviewRequest)
}

export function searchHistoricalReviews(input: HistoricalReviewSearchInput = {}) {
  const params = new URLSearchParams()

  Object.entries(input).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const trimmed = item.trim()
        if (trimmed) {
          params.append(key, trimmed)
        }
      })
      return
    }

    if (value !== undefined && value !== null && String(value).trim()) {
      params.set(key, String(value).trim())
    }
  })

  const query = params.toString()
  return requestJson<HistoricalReviewSearchPage>(
    `/historical-review/search${query ? `?${query}` : ""}`,
    {
      headers: {
        "X-Author-Historical-Search-Debug": JSON.stringify(input),
      },
    },
  )
}

export function loadHistoricalReviewFilterOptions() {
  return requestJson<HistoricalReviewFilterOptions>("/historical-review/filter-options")
}

export function generateHistoricalReviewSearchCriteria(caseId: string) {
  return requestJson<HistoricalSearchCriteriaGenerationResponse>(
    `/case/${encodeURIComponent(caseId)}/historical-review/search-criteria/generate`,
    {
      method: "POST",
    },
  )
}

export function evaluateHistoricalReviewRecords(caseId: string) {
  return requestJson<HistoricalReviewRecordEvaluationsResponse>(
    `/case/${encodeURIComponent(caseId)}/historical-review/record-evaluations/evaluate`,
    {
      method: "POST",
    },
  )
}

export function generateRiskAssessment(caseId: string) {
  return requestJson<RiskAssessmentGenerationResponse>(
    `/case/${encodeURIComponent(caseId)}/risk-assessment/generate`,
    {
      method: "POST",
    },
  )
}

export function updateRiskAssessment(caseId: string, riskAssessment: RiskAssessment) {
  return runCaseAction<WorkspaceCase>(caseId, "update_risk_assessment", {
    risk_assessment: riskAssessment,
  })
}

export function updateResolutionPlan(caseId: string, resolutionPlan: ResolutionPlan) {
  return runCaseAction<WorkspaceCase>(caseId, "update_resolution_plan", {
    resolution_plan: resolutionPlan,
  })
}

export interface GenerateResolutionInput {
  root_cause_id?: string
  record_index?: number
  force?: boolean
  only_empty?: boolean
}

export function generateResolution(caseId: string, payload: GenerateResolutionInput = {}) {
  return runCaseAction<WorkspaceCase>(caseId, "generate_resolution", payload)
}

export interface GenerateCapaDraftInput {
  root_cause_id?: string
  record_index?: number
  force?: boolean
  only_empty?: boolean
  target_sections?: string[]
}

export interface GenerateCapaLevelAssignmentInput {
  target_id?: string
  assignment_index?: number
  force?: boolean
  only_empty?: boolean
}

export function updateCapaDraft(caseId: string, capaDraft: CAPADraft) {
  return runCaseAction<WorkspaceCase>(caseId, "update_capa_draft", {
    capa_draft: capaDraft,
  })
}

export function generateCapaDraft(caseId: string, payload: GenerateCapaDraftInput = {}) {
  return runCaseAction<WorkspaceCase>(caseId, "generate_capa_draft", payload)
}

export function updateCapaLevelSummary(caseId: string, capaLevelSummary: CAPALevelSummary) {
  return runCaseAction<WorkspaceCase>(caseId, "update_capa_level_summary", {
    capa_level_summary: capaLevelSummary,
  })
}

export function generateCapaLevelAssignment(caseId: string, payload: GenerateCapaLevelAssignmentInput = {}) {
  return runCaseAction<WorkspaceCase>(caseId, "generate_capa_level_assignment", payload)
}

export function updateCapaLevelReview(caseId: string, capaLevelReview: CAPALevelReview) {
  return runCaseAction<WorkspaceCase>(caseId, "update_capa_level_review", {
    capa_level_review: capaLevelReview,
  })
}

export function generateRca(caseId: string, methodId: RcaMethodId = "brainstorming") {
  return runCaseAction<WorkspaceCase>(caseId, "generate_rca", {
    method_id: methodId,
  })
}

export function acceptFacts(caseId: string, factIds: string[]) {
  return runCaseAction<WorkspaceCase>(caseId, "accept_facts", {
    fact_ids: factIds.filter(Boolean),
  })
}

export function rejectFacts(caseId: string, factIds: string[]) {
  return runCaseAction<WorkspaceCase>(caseId, "reject_facts", {
    fact_ids: factIds.filter(Boolean),
  })
}

export function acceptFact(caseId: string, factId: string) {
  return acceptFacts(caseId, [factId])
}

export function rejectFact(caseId: string, factId: string) {
  return rejectFacts(caseId, [factId])
}
