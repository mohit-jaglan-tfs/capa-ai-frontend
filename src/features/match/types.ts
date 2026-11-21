import type { AnswerMetadata } from "./summaryEvidence"
export type SearchState = "idle" | "loading" | "success" | "empty" | "error"
export type DetailState = "idle" | "loading" | "success" | "error"
export type IndexState = "loading" | "success" | "error"
export type SearchMode = "auto" | "keyword" | "exact" | "semantic"
export type MatchKind = "browse" | "record_id" | "identifier" | "keyword" | "exact" | "hybrid" | "semantic"
export interface MatchFilters {
  divisions?: string[]
  statuses?: string[]
  record_scope?: "completed" | "ongoing" | "all"
  include_cancelled?: boolean
  years: number[]
  criticalities: string[]
  dr_types: string[]
  departments: string[]
  date_from: string | null
  date_to: string | null
  capa: "any" | "linked" | "completed" | "none"
}
export interface SearchInput {
  query: string
  site: string
  topK: number
  mode: SearchMode
  filters: MatchFilters
  offset: number
}
export interface FilterOptions {
  scope: string
  snapshotId: string
  scopeCount: number
  eligibleCount: number
  missingDates: number
  filters: MatchFilters
  statusCounts?: import("./scopeModel").StatusCounts
  facets: Partial<Record<"divisions" | "statuses", { value: string | number; count: number }[]>> & Record<"years" | "criticalities" | "dr_types" | "departments", { value: string | number; count: number }[]>
}

export interface MatchRow {
  division?: string
  deviationId: string
  site: string
  openedDate: string
  status: string
  criticality: string
  scoreLabel: string
  score: string
  excerpt: string
  matchedField: string
  snapshotId: string
  recordName: string
  drType: string
  department: string
  capaCount: number
  matchKind: MatchKind
  reasons: string[]
  spans: { start: number; end: number }[]
  relationship?: "direct" | "related"
}

export interface CapaRow {
  capaId: string
  status: string
  title: string
  capaType: string
  summary: string
}

export interface RecordDetail {
  deviationId: string
  site: string
  snapshotId: string
  sections: { label: string; text: string }[]
  capas: CapaRow[]
  literalSections?: { label: string; text: string }[]
}

export interface SearchResult {
  reviewId?: string
  cacheHit?: boolean
  reviewState?: string
  snapshotId?: string
  rows: MatchRow[]
  totalCount: number
  query: string
  scope: string
  mockEmbeddings: boolean
  searchMode: MatchKind
  requestedMode: SearchMode
  eligibleCount: number | null
  scopeCount: number | null
  totalMatches: number | null
  filters: MatchFilters | null
  requiredIdentifiers: string[]
  offset: number
  limit: number
  hasMore: boolean
  rankingHelp: string | null
  interpretation?: { query: string; origin: "llm" | "local" } | null
  submittedCriteria?: SearchInput
  summaryId?: string | null
}

export interface EvidenceOverview extends AnswerMetadata {
  reviewedStatusCounts?: import("./scopeModel").StatusCounts
  searchId: string
  snapshotId: string
  lines: { text: string; references: string[] }[]
  reviewedIds: string[]
  returnedCount: number
}

export interface IndexInfo {
  progressiveSearch?: boolean
  records: number
  sites: { site: string; count: number }[]
  modelName: string
  snapshotId: string
  mockEmbeddings: boolean
  divisions?: string[]
  semanticState?: "warming" | "ready" | "unavailable"
}
