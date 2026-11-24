export interface ReportKeyValueRow {
  label: string
  value: string
}

export interface ReportParagraphBlock {
  kind: "paragraphs"
  title?: string
  paragraphs: string[]
}

export interface ReportKeyValueBlock {
  kind: "keyValue"
  title?: string
  rows: ReportKeyValueRow[]
}

export interface ReportTableBlock {
  kind: "table"
  title?: string
  headers: string[]
  rows: string[][]
}

export interface ReportCardMetadataRow {
  label: string
  value: string
}

export interface ReportCardSection {
  title: string
  kind: "paragraphs" | "list"
  paragraphs?: string[]
  items?: string[]
}

export interface ReportHistoricalReviewRecordCardBlock {
  kind: "historicalRecordCard"
  title: string
  recordId: string
  metadata: ReportCardMetadataRow[]
  sections: ReportCardSection[]
}

export interface ReportHistoricalReviewEvaluationCardBlock {
  kind: "historicalReviewEvaluationCard"
  title: string
  recordId: string
  metadata: ReportCardMetadataRow[]
  sections: ReportCardSection[]
}

export interface ReportDetailCardGroup {
  title: string
  metadata?: ReportCardMetadataRow[]
  sections?: ReportCardSection[]
}

export interface ReportDetailCardBlock {
  kind: "detailCard"
  title: string
  variant?: "resolutionRecord" | "capaDraftRecord" | "capaLevelAssignment" | "capaLevelReview"
  subtitle?: string
  status?: string
  metadata?: ReportCardMetadataRow[]
  groups?: ReportDetailCardGroup[]
  sections?: ReportCardSection[]
}

export interface ReportSequenceEvent {
  dateTime: string
  event: string
  traceability: string[]
  confidence?: number
  reviewStatus?: string
  reviewReason?: string
}

export interface ReportSequenceEventsBlock {
  kind: "sequenceEvents"
  title?: string
  events: ReportSequenceEvent[]
}

export interface ReportFiveWhyStep {
  whyNumber: number
  question: string
  answer: string
  supportingEvidenceIds: string[]
  confidence?: number
}

export interface ReportFiveWhys {
  problemStatement: string
  steps: ReportFiveWhyStep[]
  finalRootCause: string
  confidence?: number
  reasoningSummary?: string
  assumptions: string[]
  evidenceGaps: string[]
  evidenceSummary?: string
  supportingFactIds: string[]
  supportingSectionIds: string[]
  humanReviewRequired?: boolean
}

export interface ReportFiveWhysBlock {
  kind: "fiveWhys"
  title?: string
  fiveWhys: ReportFiveWhys
}

export type ReportBlock =
  | ReportParagraphBlock
  | ReportKeyValueBlock
  | ReportTableBlock
  | ReportDetailCardBlock
  | ReportSequenceEventsBlock
  | ReportFiveWhysBlock
  | ReportHistoricalReviewRecordCardBlock
  | ReportHistoricalReviewEvaluationCardBlock

export interface ReportSection {
  title: string
  blocks: ReportBlock[]
}

export interface InvestigationReport {
  title: string
  caseId: string
  generatedAtIso: string
  disclaimer: string
  sections: ReportSection[]
}
