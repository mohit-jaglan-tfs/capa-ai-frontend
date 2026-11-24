import { requestJson } from "./client"

export interface DraftEntry {
  draft_id: string
  case_id: string
  section_key: string
  title: string
  content: string
  status: string
  version: number
  created_at: string
  updated_at: string
  created_by: string
  source_facts: Array<Record<string, unknown>>
  source_evidence_ids: string[]
  last_edited_by: string
  metadata?: Record<string, unknown>
  storage_backend?: string | null
  persistence_warning?: string | null
}

export interface DraftCreateInput {
  section_key: string
  title: string
  content: string
  create_new_version?: boolean
  status?: string
  created_by?: string
  last_edited_by?: string
  source_facts?: Array<Record<string, unknown>>
  source_evidence_ids?: string[]
  metadata?: Record<string, unknown>
}

export interface DraftUpdateInput {
  title?: string
  content?: string
  status?: string
  last_edited_by?: string
  source_facts?: Array<Record<string, unknown>>
  source_evidence_ids?: string[]
  metadata?: Record<string, unknown>
}

export function listCaseDrafts(caseId: string) {
  return requestJson<DraftEntry[]>(`/case/${encodeURIComponent(caseId)}/drafts`)
}

export function saveCaseDraft(caseId: string, payload: DraftCreateInput) {
  return requestJson<DraftEntry>(`/case/${encodeURIComponent(caseId)}/drafts`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function loadDraft(draftId: string) {
  return requestJson<DraftEntry>(`/drafts/${encodeURIComponent(draftId)}`)
}

export function updateDraft(draftId: string, payload: DraftUpdateInput) {
  return requestJson<DraftEntry>(`/drafts/${encodeURIComponent(draftId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}
