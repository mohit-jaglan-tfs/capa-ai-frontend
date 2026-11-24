// @ts-nocheck
import type {
  CAPADraft,
  CAPALevelReview,
  CAPALevelSummary,
  HistoricalReview,
  HistoricalReviewRecordEvaluation,
  HistoricalReviewSelectedRecord,
  ResolutionPlan,
  ResolutionRecord,
  RiskAssessment,
  WorkspaceCase,
  WorkspaceEvidence,
  WorkspaceFact,
} from "../api/workspace"
import type {
  InvestigationReport,
  ReportBlock,
  ReportFiveWhysBlock,
  ReportFiveWhyStep,
  ReportCardMetadataRow,
  ReportCardSection,
  ReportDetailCardBlock,
  ReportDetailCardGroup,
  ReportHistoricalReviewEvaluationCardBlock,
  ReportHistoricalReviewRecordCardBlock,
  ReportKeyValueRow,
  ReportSequenceEvent,
  ReportSequenceEventsBlock,
  ReportSection,
} from "./reportModel"
import {
  filterHistoricalReviewCandidateRecords,
  filterHistoricalReviewRecordEvaluations,
  getHistoricalReviewReviewedCount,
  resolveHistoricalReviewSummary,
} from "../historicalReviewSelection"

const REPORT_DISCLAIMER = "AUTHOR supports assisted drafting only. Final content must be reviewed by a qualified person before use in a regulated context."

type RecordLike = Record<string, unknown>

function isRecord(value: unknown): value is RecordLike {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function formatLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase())
}

function formatTitleCaseLabel(key: string) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function asText(value: unknown) {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) {
    const items = value.map((item) => asText(item)).filter(Boolean)
    return items.join(", ")
  }
  return ""
}

function asTextArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => asText(item)).filter(Boolean)
}

function asConfidence(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : undefined
}

function formatHistoricalReviewClassification(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  if (normalized === "related_repeat") return "Related - Repeat"
  if (normalized === "related_non_repeat") return "Related - Non-Repeat"
  if (normalized === "not_related") return "Not Related"
  if (normalized === "unclear_needs_review") return "Unclear - Needs Review"
  return asText(value)
}

function formatHistoricalReviewConfidence(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  if (!normalized) return ""
  if (["high", "medium", "low"].includes(normalized)) {
    return normalized.replace(/^./, (character) => character.toUpperCase())
  }
  return asText(value)
}

function formatSequenceReviewStatus(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  if (!normalized || normalized === "keep") return ""
  if (normalized === "candidate_review") return "Candidate Review"
  if (normalized === "candidate_drop") return "Candidate Drop"
  if (normalized === "invalid_unrenderable") return "Invalid / Unrenderable"
  return formatLabel(normalized)
}

function isCanonicalSequenceRow(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  return !normalized || normalized === "keep"
}

function formatSequenceConfidence(value: unknown) {
  const confidence = asConfidence(value)
  return confidence === undefined ? "" : `${Math.round(confidence * 100)}%`
}

function humanizeToken(value: string) {
  return formatLabel(String(value || "").trim())
}

function formatResolutionStatusLabel(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  const map: Record<string, string> = {
    not_started: "Not started",
    draft: "Draft",
    ready_for_review: "Ready for review",
    approved: "Approved",
    required: "Required",
    not_required: "Not required",
  }
  return map[normalized] || humanizeToken(normalized)
}

function formatCapaDraftStatusLabel(value: unknown) {
  return formatResolutionStatusLabel(value)
}

function formatCapaLevelStatusLabel(value: unknown) {
  return formatResolutionStatusLabel(value)
}

function formatCapaLevelReviewStatusLabel(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  const map: Record<string, string> = {
    not_started: "Not started",
    draft: "Draft",
    ready_for_review: "Ready for review",
    approved: "Reviewed",
  }
  return map[normalized] || humanizeToken(normalized)
}

function formatCapaLevelLabel(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  const map: Record<string, string> = {
    level_1: "Level 1 Elimination",
    level_2: "Level 2 Replacement",
    level_3: "Level 3 Facilitation",
    level_4: "Level 4 Detection",
    level_5: "Level 5 Mitigation",
    unassigned: "Unassigned",
  }
  return map[normalized] || "Unassigned"
}

function formatCapaLevelCategory(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
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
  }
  return map[normalized] || "Unassigned"
}

function formatCapaLevelConfidence(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  const map: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
  }
  return map[normalized] || "Not provided"
}

function formatCapaLevelReviewResult(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  const map: Record<string, string> = {
    pass: "Pass",
    review: "Review",
    fail: "Fail",
  }
  return map[normalized] || "Review"
}

function formatCapaLevelTargetType(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  const map: Record<string, string> = {
    correction_draft: "Correction",
    corrective_action_draft: "Corrective Action",
    preventive_action_draft: "Preventive Action",
    effectiveness_draft: "Effectiveness",
  }
  return map[normalized] || humanizeToken(normalized)
}

const HUMANIZABLE_PATH_LABELS = [
  "resolution_plan",
  "resolution_records",
  "correction",
  "corrective_action",
  "preventive_action",
  "effectiveness_plan",
  "correction_draft",
  "corrective_action_draft",
  "preventive_action_draft",
  "effectiveness_draft",
  "decision",
  "justification",
  "impacted_items",
  "actions",
  "owner",
  "due_date",
  "objective_evidence",
  "acceptance_criteria",
  "linked_root_causes",
  "linked_causal_factors",
  "implementation_plan",
  "expected_outcome",
  "required",
  "goal",
  "method",
  "data_source",
  "analysis_method",
  "sample_size",
  "duration",
  "success_criteria",
  "adverse_effect_review",
  "status",
  "review_notes",
  "rationale",
  "root_cause_id",
  "root_cause_statement",
  "case_id",
  "assignments",
  "summary",
  "warnings",
  "missing_fields",
  "recommendations",
  "target_id",
  "source_resolution_record_ids",
]

function createHumanizablePathPattern(label: string) {
  return label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("(?:[_ ]+)")
}

const HUMANIZABLE_PATH_PATTERNS = HUMANIZABLE_PATH_LABELS
  .map((label) => ({ label, pattern: new RegExp(`^${createHumanizablePathPattern(formatLabel(label))}(?=\\b|$)`, "i") }))
  .sort((left, right) => right.label.length - left.label.length)

function humanizePathToken(token: string) {
  const normalized = String(token || "").trim()
  if (!normalized) return ""

  const nestedTokens = normalized.split(/\s*[·:]\s*/).map((item) => item.trim()).filter(Boolean)
  if (nestedTokens.length > 1) {
    return nestedTokens.map((item) => humanizePathToken(item)).filter(Boolean).join(" · ")
  }

  const resolutionRecordMatch = normalized.match(/^resolution_records\[(\d+)\]$/i)
  if (resolutionRecordMatch) {
    return `Resolution Record ${Number(resolutionRecordMatch[1]) + 1}`
  }

  const recordIndexMatch = normalized.match(/^records\[(\d+)\]$/i)
  if (recordIndexMatch) {
    return `Record ${Number(recordIndexMatch[1]) + 1}`
  }

  const recordRefMatch = normalized.match(/^records\[([^\]]+)\]$/i)
  if (recordRefMatch) {
    return humanizePathToken(recordRefMatch[1])
  }

  const resolutionMatch = normalized.match(/^resolution\s+(\d+)$/i)
  if (resolutionMatch) {
    return `Resolution Record ${Number(resolutionMatch[1]) + 1}`
  }

  const recordMatch = normalized.match(/^record\s+(\d+)$/i)
  if (recordMatch) {
    return `Record ${Number(recordMatch[1]) + 1}`
  }

  const labelMatch = HUMANIZABLE_PATH_PATTERNS.find((entry) => entry.pattern.test(normalized))
  if (labelMatch) {
    return formatTitleCaseLabel(labelMatch.label)
  }

  return formatLabel(normalized)
}

function humanizePathReference(path: string) {
  const normalized = String(path || "").trim()
  if (!normalized) return "Unspecified field"
  if (normalized === "resolution_plan") return "Resolution Plan"
  if (normalized === "resolution_records") return "Resolution Records"

  const colonMatch = normalized.match(/^([A-Z]{2,}-\d+)\s*:\s*(.+)$/)
  if (colonMatch) {
    return `${colonMatch[1]} · ${humanizePathReference(colonMatch[2])}`
  }

  const dottedParts = normalized.split(".").map((part) => part.trim()).filter(Boolean)
  if (dottedParts.length > 1) {
    return dottedParts.map((part) => humanizePathToken(part)).join(" · ")
  }

  return humanizePathToken(normalized)
}

function consumeHumanizablePathRun(text: string, startIndex: number) {
  const remainder = text.slice(startIndex)
  const initialPatterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^resolution_records\[(\d+)\]/i, (match) => `Resolution Record ${Number(match[1]) + 1}`],
    [/^records\[(\d+)\]/i, (match) => `Record ${Number(match[1]) + 1}`],
    [/^records\[([^\]]+)\]/i, (match) => humanizePathToken(match[1])],
    [/^resolution\s+(\d+)\b/i, (match) => `Resolution Record ${Number(match[1]) + 1}`],
    [/^record\s+(\d+)\b/i, (match) => `Record ${Number(match[1]) + 1}`],
    [/^([A-Z]{2,}-\d+)\b/, (match) => match[1]],
  ]

  let firstMatch: RegExpMatchArray | null = null
  let firstText = ""
  let firstLength = 0

  for (const [pattern, formatter] of initialPatterns) {
    const match = remainder.match(pattern)
    if (!match) continue
    firstMatch = match
    firstText = formatter(match)
    firstLength = match[0].length
    break
  }

  if (!firstMatch) return null

  const pieces = [firstText]
  let cursor = startIndex + firstLength

  while (cursor < text.length) {
    const separatorMatch = text.slice(cursor).match(/^\s*([·:.])\s*/)
    if (!separatorMatch) break

    const nextIndex = cursor + separatorMatch[0].length
    const nextText = text.slice(nextIndex)
    const labelMatch = HUMANIZABLE_PATH_PATTERNS.find((entry) => entry.pattern.test(nextText))
    if (!labelMatch) break

    const next = nextText.match(labelMatch.pattern)
    if (!next) break

    pieces.push(formatTitleCaseLabel(labelMatch.label))
    cursor = nextIndex + next[0].length
  }

  return {
    text: pieces.join(" · "),
    length: cursor - startIndex,
  }
}

function humanizeMessagePaths(value: unknown) {
  const text = String(value || "").trim()
  if (!text) return ""

  let output = ""
  let index = 0
  let changed = false

  while (index < text.length) {
    const run = consumeHumanizablePathRun(text, index)
    if (run && run.length > 0) {
      output += run.text
      index += run.length
      changed = true
      continue
    }

    output += text[index]
    index += 1
  }

  return changed ? output : text
}

function formatResolutionFieldLabel(path: string) {
  return humanizePathReference(path)
}

function formatCapaDraftFieldLabel(path: string) {
  return humanizePathReference(path)
}

function formatCapaLevelFieldLabel(path: string) {
  return humanizePathReference(path)
}

function buildMetadataRows(entries: Array<[string, unknown]>) {
  const rows: ReportKeyValueRow[] = []
  for (const [label, value] of entries) {
    pushRow(rows, label, value)
  }
  return rows
}

function buildListSection(title: string, values: unknown) {
  const items = asTextArray(values)
  return items.length ? { title, kind: "list" as const, items } : null
}

function buildUniqueHumanizedListSection(title: string, values: unknown, formatter: (value: string) => string = humanizePathReference) {
  if (!Array.isArray(values)) return null

  const seen = new Set<string>()
  const items: string[] = []

  for (const value of values) {
    const raw = asText(value)
    if (!raw) continue
    const key = raw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const text = formatter(raw).trim()
    if (text) items.push(text)
  }

  return items.length ? { title, kind: "list" as const, items } : null
}

function buildParagraphSection(title: string, value: unknown) {
  const paragraphs = asLines(value)
  return paragraphs.length ? { title, kind: "paragraphs" as const, paragraphs } : null
}

function buildNarrativeSection(title: string, value: unknown) {
  if (Array.isArray(value)) {
    return buildListSection(title, value)
  }

  return buildParagraphSection(title, value)
}

function asBooleanLike(value: unknown) {
  if (typeof value === "boolean") return value
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value === 1) return true
    if (value === 0) return false
    return undefined
  }
  if (typeof value !== "string") return undefined

  const normalized = value.trim().toLowerCase()
  if (!normalized) return undefined
  if (["true", "yes"].includes(normalized)) return true
  if (["false", "no"].includes(normalized)) return false
  return undefined
}

function readBooleanLikeField(source: RecordLike | null | undefined, key: string) {
  if (!source || !Object.prototype.hasOwnProperty.call(source, key)) {
    return { present: false, value: undefined as boolean | undefined }
  }

  const value = asBooleanLike(source[key])
  return {
    present: true,
    value,
  }
}

function asLines(value: unknown) {
  if (typeof value === "string") {
    return value
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => asLines(item))
      .map((line) => line.trim())
      .filter(Boolean)
  }

  const text = asText(value)
  return text ? [text] : []
}

function uniqueText(values: unknown[]) {
  return Array.from(new Set(values.map((item) => asText(item)).filter(Boolean)))
}

function compactValue(value: unknown) {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" || typeof value === "boolean") return asText(value)
  if (Array.isArray(value)) {
    const text = uniqueText(value)
    return text.join(", ")
  }
  return ""
}

function pushRow(rows: ReportKeyValueRow[], label: string, value: unknown) {
  const text = compactValue(value)
  if (text) {
    rows.push({ label, value: text })
  }
}

function joinRefs(values: unknown[]) {
  return uniqueText(values).join(", ")
}

function safeDateText(value: unknown) {
  const text = asText(value)
  if (!text) return ""
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return text
  return parsed.toLocaleString()
}

function section(title: string, blocks: ReportBlock[]) {
  if (!blocks.length) return null
  return { title, blocks }
}

function paragraphsBlock(title: string | undefined, paragraphs: unknown[]) {
  const lines = paragraphs.flatMap((paragraph) => asLines(paragraph))
  if (!lines.length) return null
  const block = { kind: "paragraphs" as const, paragraphs: lines, ...(title ? { title } : {}) }
  return block
}

function keyValueBlock(title: string | undefined, rows: ReportKeyValueRow[]) {
  if (!rows.length) return null
  const block = { kind: "keyValue" as const, rows, ...(title ? { title } : {}) }
  return block
}

function tableBlock(title: string | undefined, headers: string[], rows: string[][]) {
  const nonEmptyRows = rows.filter((row) => row.some((cell) => cell.trim()))
  if (!nonEmptyRows.length) return null
  const block = { kind: "table" as const, headers, rows: nonEmptyRows, ...(title ? { title } : {}) }
  return block
}

function cardSection(title: string, value: unknown, kind: "paragraphs" | "list"): ReportCardSection | null {
  if (kind === "list") {
    const items = asTextArray(value)
    if (!items.length) return null
    return { title, kind, items }
  }

  const paragraphs = asLines(value)
  if (!paragraphs.length) return null
  return { title, kind, paragraphs }
}

function pushCardMetadata(rows: ReportCardMetadataRow[], label: string, value: unknown) {
  const text = compactValue(value)
  if (text) {
    rows.push({ label, value: text })
  }
}

function buildHistoricalRecordCard(record: HistoricalReviewSelectedRecord): ReportHistoricalReviewRecordCardBlock | null {
  const recordId = compactValue(record.pr_id)
  if (!recordId) return null

  const metadata: ReportCardMetadataRow[] = []
  pushCardMetadata(metadata, "Opened", record.date_opened)
  pushCardMetadata(metadata, "Closed", record.date_closed)
  pushCardMetadata(metadata, "Criticality", record.tw_v_initial_criticality)
  pushCardMetadata(metadata, "Site", record.tw_v_site)
  pushCardMetadata(metadata, "Department", record.tw_v_responsible_department)
  pushCardMetadata(metadata, "Type", record.tw_v_dr_type)
  pushCardMetadata(metadata, "Search Type", record.search_type)

  const sections: ReportCardSection[] = []
  const matchReason = cardSection("Match Reason", record.match_reason, "paragraphs")
  if (matchReason) sections.push(matchReason)
  const conclusion = cardSection("Conclusion", record.conclusion, "paragraphs")
  if (conclusion) sections.push(conclusion)

  return {
    kind: "historicalRecordCard",
    title: `Historical Record: ${recordId}`,
    recordId,
    metadata,
    sections,
  }
}

function buildHistoricalReviewEvaluationCard(record: HistoricalReviewRecordEvaluation): ReportHistoricalReviewEvaluationCardBlock | null {
  const recordId = compactValue(record.record_id)
  if (!recordId) return null

  const metadata: ReportCardMetadataRow[] = []
  pushCardMetadata(metadata, "Classification", formatHistoricalReviewClassification(record.classification))
  pushCardMetadata(metadata, "Confidence", formatHistoricalReviewConfidence(record.confidence))
  pushCardMetadata(metadata, "Human Review Required", record.review_required)
  pushCardMetadata(metadata, "Evaluated At", record.evaluated_at)

  const sections: ReportCardSection[] = []
  const evidenceUsed = cardSection("Evidence Used", record.evidence_used || [], "list")
  if (evidenceUsed) sections.push(evidenceUsed)
  const rationale = cardSection("Rationale", record.rationale, "paragraphs")
  if (rationale) sections.push(rationale)

  return {
    kind: "historicalReviewEvaluationCard",
    title: `Record Evaluation: ${recordId}`,
    recordId,
    metadata,
    sections,
  }
}

function compactMetadataRows(metadata: RecordLike | null | undefined) {
  const rows: ReportKeyValueRow[] = []
  if (!metadata) return rows

  for (const [key, value] of Object.entries(metadata)) {
    const text = compactValue(value)
    if (text) {
      rows.push({ label: formatLabel(key), value: text })
    }
  }

  return rows
}

const CASE_INFORMATION_METADATA_DUPLICATE_KEYS = new Set([
  "short_description",
  "assigned_to",
  "site",
  "current_state",
  "date_opened",
  "date_due",
  "date_closed",
  "days_remaining",
  "rapid_status",
])

function normalizeCaseInformationMetadataKey(key: string) {
  return String(key || "").trim().toLowerCase().replace(/\s+/g, "_")
}

function isClosedTrackwiseState(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  return /\b(closed|completed|complete|done|resolved|cancelled|canceled)\b/.test(normalized)
}

function buildCaseInformationSection(workspace: WorkspaceCase) {
  const intake = workspace.case_intake || null
  const rows: ReportKeyValueRow[] = []
  const trackwise = isRecord(intake?.trackwise_record) ? intake.trackwise_record : null
  const closedTrackwiseState = isClosedTrackwiseState(trackwise?.current_state)

  pushRow(rows, "Case ID", workspace.case_id)
  pushRow(rows, "TrackWise PR ID", intake?.pr_id)
  pushRow(rows, "Short Description", trackwise?.short_description)
  pushRow(rows, "Assigned To", trackwise?.assigned_to)
  pushRow(rows, "Site", trackwise?.site)
  pushRow(rows, "Current State", trackwise?.current_state)
  pushRow(rows, "Rapid Status", intake?.rapid_status)
  if (trackwise) {
    pushRow(rows, "Date Opened", safeDateText(trackwise.date_opened))
    pushRow(rows, "Date Due", safeDateText(trackwise.date_due))
    pushRow(rows, "Date Closed", safeDateText(trackwise.date_closed || trackwise.closed_date || trackwise.closed_at))
    if (!closedTrackwiseState) {
      pushRow(rows, "Days Remaining", trackwise.days_remaining)
    }
  }

  if (intake?.metadata && isRecord(intake.metadata)) {
    for (const row of compactMetadataRows(intake.metadata)) {
      const normalizedKey = normalizeCaseInformationMetadataKey(row.label)
      if (CASE_INFORMATION_METADATA_DUPLICATE_KEYS.has(normalizedKey)) {
        continue
      }
      rows.push({ label: `Metadata - ${row.label}`, value: row.value })
    }
  }

  const block = keyValueBlock(undefined, rows)
  return block ? section("Case Information", [block]) : null
}

function buildInvestigationNarrativeSection(title: string, value: unknown) {
  if (typeof value === "string") {
    const block = paragraphsBlock(undefined, [value])
    return block ? section(title, [block]) : null
  }

  if (!isRecord(value)) return null

  const rows: ReportKeyValueRow[] = []
  const paragraphFields: unknown[] = []

  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || item === null) continue
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      pushRow(rows, formatLabel(key), item)
      continue
    }
    if (Array.isArray(item)) {
      const text = compactValue(item)
      if (text) {
        pushRow(rows, formatLabel(key), text)
      }
      continue
    }
    if (isRecord(item)) {
      const nestedRows = compactMetadataRows(item)
      if (nestedRows.length > 0) {
        paragraphFields.push(`${formatLabel(key)}:`)
        for (const nested of nestedRows) {
          paragraphFields.push(`- ${nested.label}: ${nested.value}`)
        }
      }
    }
  }

  const blocks: ReportBlock[] = []
  const narrative = paragraphsBlock(undefined, paragraphFields)
  if (narrative) blocks.push(narrative)
  const table = keyValueBlock(undefined, rows)
  if (table) blocks.push(table)
  return section(title, blocks)
}

function normalizeBackgroundSectionRows(value: unknown) {
  let source = isRecord(value) && isRecord(value.background_information)
    ? value.background_information
    : value

  if (typeof source === "string") {
    const trimmed = source.trim()
    if (!trimmed) {
      source = null
    } else {
      try {
        source = JSON.parse(trimmed)
      } catch {
        source = { summary: trimmed }
      }
    }
  }

  const record = isRecord(source) ? source : null
  if (!record) {
    return {
      summary: "",
      processContext: [] as string[],
      equipmentUtilitiesContext: [] as string[],
      sourceReferences: [] as string[],
      missingInformation: [] as string[],
    }
  }

  const processContext = uniqueText([
    ...asLines(record.process_context),
    ...asLines(record.process_description),
    ...asLines(record.manufacturing_context),
  ])
  const equipmentUtilitiesContext = uniqueText([
    ...asLines(record.equipment_utilities_context),
    ...asLines(record.equipment_involved),
    ...asLines(record.utility_involved),
  ])
  const sourceReferences = uniqueText([
    ...asLines(record.source_references),
  ])
  const missingInformation = uniqueText([
    ...asLines(record.missing_information),
  ])

  const summary = compactValue(record.summary || "")
    || (processContext[0] || equipmentUtilitiesContext[0] || "")

  return {
    summary,
    processContext,
    equipmentUtilitiesContext,
    sourceReferences,
    missingInformation,
  }
}

function buildBackgroundInformationSection(value: unknown) {
  const background = normalizeBackgroundSectionRows(value)
  const blocks: ReportBlock[] = []

  const summaryBlock = paragraphsBlock("Summary", [background.summary])
  if (summaryBlock) blocks.push(summaryBlock)

  const processBlock = paragraphsBlock("Process Context", background.processContext)
  if (processBlock) blocks.push(processBlock)

  const equipmentBlock = paragraphsBlock("Equipment / Utilities Context", background.equipmentUtilitiesContext)
  if (equipmentBlock) blocks.push(equipmentBlock)

  const sourceBlock = paragraphsBlock("Source References", background.sourceReferences)
  if (sourceBlock) blocks.push(sourceBlock)

  const missingBlock = paragraphsBlock("Missing Information", background.missingInformation)
  if (missingBlock) blocks.push(missingBlock)

  if (!blocks.length) {
    const unavailable = paragraphsBlock(undefined, ["Background information not available from current evidence."])
    if (unavailable) blocks.push(unavailable)
  }

  return section("Investigation Background", blocks)
}

function buildEvidenceSection(workspace: WorkspaceCase) {
  const rows = (workspace.evidence || []).map((item: WorkspaceEvidence) => [
    compactValue(item.evidence_id),
    compactValue(item.evidence_title || item.note || item.source_name),
    compactValue(item.source_type),
    compactValue(item.source_reference || item.source_name),
    compactValue(item.source_location || item.source_field),
  ])

  const block = tableBlock(undefined, ["Evidence ID", "Title", "Source Type", "Source / Reference", "Source Location"], rows)
  return block ? section("Evidence Reviewed", [block]) : null
}

function buildAcceptedFactsSection(workspace: WorkspaceCase) {
  const facts = workspace.facts?.accepted || []
  const rows = facts.map((fact: WorkspaceFact) => {
    const evidenceRefs = uniqueText([
      fact.evidence_id,
      fact.evidence_title,
      fact.source_reference,
      fact.source_name,
      fact.source_location,
      ...(fact.provenance || []).flatMap((entry) => [
        entry.evidence_id,
        entry.evidence_title,
        entry.source_reference,
        entry.source_name,
        entry.source_location,
      ]),
    ])

    return [
      compactValue(fact.fact_id),
      compactValue(fact.statement),
      joinRefs(evidenceRefs),
    ]
  })

  const block = tableBlock(undefined, ["Fact ID", "Fact Statement", "Evidence References"], rows)
  return block ? section("Accepted Investigation Facts", [block]) : null
}

function buildSequenceSection(sequenceOfEvents: unknown) {
  const sourceRows = (() => {
    if (Array.isArray(sequenceOfEvents)) return sequenceOfEvents
    if (isRecord(sequenceOfEvents) && Array.isArray(sequenceOfEvents.sequence_of_events)) return sequenceOfEvents.sequence_of_events
    if (typeof sequenceOfEvents === "string") {
      try {
        const parsed = JSON.parse(sequenceOfEvents)
        if (Array.isArray(parsed)) return parsed
        if (isRecord(parsed) && Array.isArray(parsed.sequence_of_events)) return parsed.sequence_of_events
      } catch {
        return []
      }
    }
    return []
  })()

  const events: ReportSequenceEvent[] = []

  for (const item of sourceRows) {
    if (!isRecord(item)) continue
    if (!isCanonicalSequenceRow(item.review_status)) continue
    const confidence = asConfidence(item.confidence)
    const traceability = uniqueText([
      ...(Array.isArray(item.supporting_fact_ids) ? item.supporting_fact_ids : []),
      ...(Array.isArray(item.supporting_evidence_references) ? item.supporting_evidence_references : []),
    ])

    events.push({
      dateTime: compactValue(item.date_time),
      event: compactValue(item.event),
      traceability,
      ...(confidence !== undefined ? { confidence } : {}),
      ...(formatSequenceReviewStatus(item.review_status) ? { reviewStatus: String(item.review_status || "").trim().toLowerCase() } : {}),
      ...(String(item.review_reason || "").trim() ? { reviewReason: String(item.review_reason || "").trim() } : {}),
    })
  }

  const block: ReportSequenceEventsBlock | null = events.length
    ? { kind: "sequenceEvents", events }
    : null
  return block ? section("Sequence of Events", [block]) : null
}

function buildHistoricalReviewSection(workspace: WorkspaceCase) {
  const review = workspace.historical_review || null
  if (!review) return null

  const blocks: ReportBlock[] = []
  const currentPrId = String(workspace.case_intake?.pr_id || "").trim()
  const selectedRecords = filterHistoricalReviewCandidateRecords(
    (review.selected_records_output?.records || review.selected_records || []) as HistoricalReviewSelectedRecord[],
    currentPrId,
  )
  const selectedRecordIds = selectedRecords.map((record) => String(record.pr_id).trim()).filter(Boolean)
  const filteredEvaluations = filterHistoricalReviewRecordEvaluations(
    review.record_evaluations || [],
    selectedRecordIds,
  ) as HistoricalReviewRecordEvaluation[]
  const reviewedRecordCount = getHistoricalReviewReviewedCount(selectedRecords, filteredEvaluations)
  const resolvedSummary = resolveHistoricalReviewSummary(review.summary, selectedRecords)
  const summaryRows: ReportKeyValueRow[] = []
  pushRow(summaryRows, "Status", review.status)
  pushRow(summaryRows, "Summary", resolvedSummary)
  pushRow(summaryRows, "Search Criteria", review.search_criteria)
  pushRow(summaryRows, "Timeframe", review.timeframe)
  pushRow(summaryRows, "Date Opened From", review.date_opened_from)
  pushRow(summaryRows, "Date Opened To", review.date_opened_to)
  pushRow(summaryRows, "Date Closed From", review.date_closed_from)
  pushRow(summaryRows, "Date Closed To", review.date_closed_to)
  pushRow(summaryRows, "Systems Searched", review.systems_searched)
  pushRow(summaryRows, "Records Reviewed", reviewedRecordCount)
  pushRow(summaryRows, "Confidence", review.confidence)
  pushRow(summaryRows, "Impact on Investigation", review.impact_on_investigation)
  pushRow(summaryRows, "Impact on Risk", review.impact_on_risk)
  pushRow(summaryRows, "Impact on RCA", review.impact_on_rca)

  const searchDraft = review.search_criteria_draft || null
  if (searchDraft) {
    pushRow(summaryRows, "Search Draft Objective", searchDraft.objective)
    pushRow(summaryRows, "Search Draft Event Summary", searchDraft.event_summary)
    pushRow(summaryRows, "Search Draft Rationale", searchDraft.rationale)
    pushRow(summaryRows, "Search Draft Recommended Systems", searchDraft.recommended_systems)
    pushRow(summaryRows, "Search Draft Limitations", searchDraft.limitations)
    pushRow(summaryRows, "Search Draft Source Fact IDs", searchDraft.source_fact_ids)
    if (searchDraft.timeframe) {
      pushRow(summaryRows, "Search Draft Timeframe Start", searchDraft.timeframe.start)
      pushRow(summaryRows, "Search Draft Timeframe End", searchDraft.timeframe.end)
      pushRow(summaryRows, "Search Draft Timeframe Rationale", searchDraft.timeframe.rationale)
    }
    if (searchDraft.search_terms) {
      pushRow(summaryRows, "Search Draft Required Terms", searchDraft.search_terms.required)
      pushRow(summaryRows, "Search Draft Optional Terms", searchDraft.search_terms.optional)
      pushRow(summaryRows, "Search Draft Exclude Terms", searchDraft.search_terms.exclude)
    }
    if (searchDraft.scope) {
      pushRow(summaryRows, "Search Draft Scope Site", searchDraft.scope.site)
      pushRow(summaryRows, "Search Draft Scope Product", searchDraft.scope.product)
      pushRow(summaryRows, "Search Draft Scope Equipment", searchDraft.scope.equipment)
      pushRow(summaryRows, "Search Draft Scope Process", searchDraft.scope.process)
      pushRow(summaryRows, "Search Draft Scope Department", searchDraft.scope.department)
    }
  }

  const summaryBlock = keyValueBlock("Search Scope and Criteria", summaryRows)
  if (summaryBlock) blocks.push(summaryBlock)

  const selectedBlocks = selectedRecords
    .map((record) => buildHistoricalRecordCard(record))
    .filter((block): block is ReportHistoricalReviewRecordCardBlock => Boolean(block))
  if (selectedBlocks.length) {
    blocks.push(...selectedBlocks)
  }

  const evaluationBlocks = filteredEvaluations
    .map((record) => buildHistoricalReviewEvaluationCard(record))
    .filter((block): block is ReportHistoricalReviewEvaluationCardBlock => Boolean(block))
  if (evaluationBlocks.length) {
    blocks.push(...evaluationBlocks)
  }

  const conclusionRows: ReportKeyValueRow[] = []
  pushRow(conclusionRows, "Recommendations", review.recommendations)
  pushRow(conclusionRows, "Review Notes", review.review_notes)
  pushRow(conclusionRows, "Attachments", review.attachments)
  pushRow(conclusionRows, "Selected Records Count", selectedRecords.length)
  pushRow(conclusionRows, "Historical Records Reviewed", reviewedRecordCount)
  const conclusionBlock = keyValueBlock("Conclusions", conclusionRows)
  if (conclusionBlock) blocks.push(conclusionBlock)

  return section("Historical Review", blocks)
}

function getNativeFiveWhysPayload(rca: RecordLike | null) {
  if (!rca) return null
  const nativePayload = isRecord(rca.native) ? rca.native : null
  const nativeFiveWhys = isRecord(nativePayload?.five_whys) ? nativePayload.five_whys : null
  return nativeFiveWhys && Object.keys(nativeFiveWhys).length > 0 ? nativeFiveWhys : null
}

function mapFiveWhysStep(item: unknown, index: number): ReportFiveWhyStep | null {
  const step = isRecord(item) ? item : null
  if (!step) return null

  const answer = asText(step.answer)
  if (!answer) return null

  return {
    whyNumber: Number(step.why_number) || index + 1,
    question: asText(step.question) || `Why ${index + 1}`,
    answer,
    supportingEvidenceIds: asTextArray(step.supporting_evidence_ids),
    ...(asConfidence(step.confidence) !== undefined ? { confidence: asConfidence(step.confidence) } : {}),
  }
}

function buildNativeFiveWhysBlock(nativeFiveWhys: RecordLike, legacyHumanReviewRequired?: unknown): ReportFiveWhysBlock | null {
  const evidenceSummary = isRecord(nativeFiveWhys.evidence_summary) ? nativeFiveWhys.evidence_summary : null
  const nativeHumanReviewRequired = readBooleanLikeField(nativeFiveWhys, "human_review_required")
  const legacyHumanReviewRequiredValue = asBooleanLike(legacyHumanReviewRequired)
  const rootCauseConfidence = asConfidence(isRecord(nativeFiveWhys.root_cause) ? nativeFiveWhys.root_cause.confidence : null)
  const steps = Array.isArray(nativeFiveWhys.why_steps)
    ? nativeFiveWhys.why_steps.map((item, index) => mapFiveWhysStep(item, index)).filter((step): step is ReportFiveWhyStep => Boolean(step))
    : []

  const humanReviewRequired =
    nativeHumanReviewRequired.present
      ? nativeHumanReviewRequired.value
      : legacyHumanReviewRequiredValue

  const block = {
    kind: "fiveWhys" as const,
    title: "Five Whys Analysis",
    fiveWhys: {
      problemStatement: asText(nativeFiveWhys.problem_statement),
      steps,
      finalRootCause:
        asText(isRecord(nativeFiveWhys.root_cause) ? nativeFiveWhys.root_cause.statement : null)
        || asText(isRecord(nativeFiveWhys.final_root_cause) ? nativeFiveWhys.final_root_cause.statement : null),
      ...(rootCauseConfidence !== undefined ? { confidence: rootCauseConfidence } : {}),
      reasoningSummary: asText(nativeFiveWhys.reasoning_summary),
      assumptions: asTextArray(nativeFiveWhys.assumptions),
      evidenceGaps: [
        ...asTextArray(nativeFiveWhys.evidence_gaps),
        ...asTextArray(nativeFiveWhys.notable_gaps),
        ...asTextArray(evidenceSummary?.notable_gaps),
      ],
      evidenceSummary: asText(nativeFiveWhys.evidence_summary) || asText(evidenceSummary?.summary),
      supportingFactIds: [
        ...asTextArray(nativeFiveWhys.supporting_fact_ids),
        ...asTextArray(evidenceSummary?.supporting_fact_ids),
      ],
      supportingSectionIds: [
        ...asTextArray(nativeFiveWhys.supporting_section_ids),
        ...asTextArray(evidenceSummary?.supporting_section_ids),
      ],
      humanReviewRequired,
    },
  } satisfies ReportFiveWhysBlock

  if (!block.fiveWhys.problemStatement && !block.fiveWhys.finalRootCause && !block.fiveWhys.steps.length) {
    return null
  }

  block.fiveWhys.evidenceGaps = Array.from(new Set(block.fiveWhys.evidenceGaps))
  block.fiveWhys.supportingFactIds = Array.from(new Set(block.fiveWhys.supportingFactIds))
  block.fiveWhys.supportingSectionIds = Array.from(new Set(block.fiveWhys.supportingSectionIds))

  return block
}

function buildRootCauseSection(workspace: WorkspaceCase) {
  const rca = isRecord(workspace.rca) ? workspace.rca : null
  const rootCause = isRecord(workspace.root_cause) ? workspace.root_cause : null
  if (!rca && !rootCause) return null

  const nativeFiveWhys = getNativeFiveWhysPayload(rca)
  if (nativeFiveWhys) {
    const nativeBlock = buildNativeFiveWhysBlock(nativeFiveWhys, rca?.human_review_required)
    return nativeBlock ? section("Root Cause Analysis", [nativeBlock]) : null
  }

  const blocks: ReportBlock[] = []
  const summaryRows: ReportKeyValueRow[] = []
  pushRow(summaryRows, "Method", rca?.method_id)
  pushRow(summaryRows, "Problem Statement", rca?.problem_statement)
  pushRow(summaryRows, "Root Cause Statement", asText(rca?.root_cause && isRecord(rca.root_cause) ? rca.root_cause.statement : rootCause?.statement))
  pushRow(summaryRows, "Human Review Required", rca?.human_review_required)
  pushRow(summaryRows, "Supporting Fact IDs", rca?.supporting_fact_ids)
  pushRow(summaryRows, "Evidence Gaps", rca?.evidence_gaps)
  pushRow(summaryRows, "Reasoning Summary", rca?.reasoning_summary)
  pushRow(summaryRows, "Final Root Cause", rca?.final_root_cause && isRecord(rca.final_root_cause) ? rca.final_root_cause.statement : null)
  const summaryBlock = keyValueBlock("RCA Summary", summaryRows)
  if (summaryBlock) blocks.push(summaryBlock)

  const whyChain = Array.isArray(rca?.why_chain) ? rca.why_chain : []
  const whyRows = whyChain.map((item, index) => {
    if (!isRecord(item)) return ["", "", "", "", "", ""]
    return [
      compactValue(item.why_number || index + 1),
      compactValue(item.question),
      compactValue(item.answer),
      joinRefs(uniqueText([...(Array.isArray(item.supporting_evidence_references) ? item.supporting_evidence_references : []), ...(Array.isArray(item.supporting_fact_ids) ? item.supporting_fact_ids : [])])),
      joinRefs(uniqueText(item.supporting_outcome_ids || [])),
      compactValue(item.confidence),
    ]
  })
  const whyBlock = tableBlock(
    "Causal Chain",
    ["Why #", "Question", "Answer", "Traceability", "Outcome IDs", "Confidence"],
    whyRows,
  )
  if (whyBlock) blocks.push(whyBlock)

  const candidateCauses = Array.isArray(rca?.candidate_causes) ? rca.candidate_causes : []
  const candidateRows = candidateCauses.map((item) => {
    if (!isRecord(item)) return ["", "", "", ""]
    return [
      compactValue(item.statement),
      compactValue(item.support_level),
      joinRefs(uniqueText(item.supporting_fact_ids || [])),
      compactValue(item.rationale),
    ]
  })
  const candidateBlock = tableBlock(
    "Candidate Causes",
    ["Statement", "Support Level", "Supporting Facts", "Rationale"],
    candidateRows,
  )
  if (candidateBlock) blocks.push(candidateBlock)

  const evidenceSummary = isRecord(rca?.evidence_summary) ? rca.evidence_summary : null
  const evidenceRows: ReportKeyValueRow[] = []
  pushRow(evidenceRows, "Evidence Summary", evidenceSummary?.summary)
  pushRow(evidenceRows, "Supporting Fact IDs", evidenceSummary?.supporting_fact_ids)
  pushRow(evidenceRows, "Supporting Section IDs", evidenceSummary?.supporting_section_ids)
  pushRow(evidenceRows, "Notable Gaps", evidenceSummary?.notable_gaps)
  const evidenceBlock = keyValueBlock("Supporting Rationale and Evidence", evidenceRows)
  if (evidenceBlock) blocks.push(evidenceBlock)

  return section("Root Cause Analysis", blocks)
}

function buildImpactRiskSection(workspace: WorkspaceCase) {
  const blocks: ReportBlock[] = []

  const impact = workspace.impact_assessment
  const impactRows: ReportKeyValueRow[] = []
  if (typeof impact === "string") {
    const narrative = paragraphsBlock("Impact Assessment", [impact])
    if (narrative) blocks.push(narrative)
  } else if (isRecord(impact)) {
    pushRow(impactRows, "Impact Summary", impact.impact_summary)
    pushRow(impactRows, "Product Quality Impact", impact.product_quality_impact)
    pushRow(impactRows, "Patient Safety Impact", impact.patient_safety_impact)
    pushRow(impactRows, "Operational Impact", impact.operational_impact)
    pushRow(impactRows, "Reviewed Fact IDs", impact.reviewed_fact_ids)
    const impactBlock = keyValueBlock("Impact Assessment", impactRows)
    if (impactBlock) blocks.push(impactBlock)
  }

  const risk = workspace.risk_assessment
  if (risk) {
    const riskRows: ReportKeyValueRow[] = []
    pushRow(riskRows, "Status", risk.status)
    pushRow(riskRows, "Investigator Summary", risk.investigator_summary)
    pushRow(riskRows, "Severity", risk.risk_judgment?.severity || risk.severity)
    pushRow(riskRows, "Likelihood of Recurrence", risk.risk_judgment?.likelihood_of_recurrence || risk.likelihood_of_recurrence)
    pushRow(riskRows, "Rationale", risk.risk_judgment?.rationale || risk.scientific_rationale)
    pushRow(riskRows, "Historical Review Summary", risk.historical_review_summary?.summary)
    pushRow(riskRows, "Historical Review Impact", risk.historical_review_summary?.impact_on_recurrence)
    pushRow(riskRows, "Objective Evidence Reviewed", risk.objective_evidence_reviewed)
    pushRow(riskRows, "Recommended Next Steps", risk.recommended_next_steps || risk.next_steps)
    pushRow(riskRows, "Human Review Notes", risk.human_review_notes)
    pushRow(riskRows, "Source Fact IDs", risk.source_fact_ids || risk.traceability?.source_fact_ids)
    const riskBlock = keyValueBlock("Risk Assessment", riskRows)
    if (riskBlock) blocks.push(riskBlock)
  }

  return section("Impact / Risk Assessment", blocks)
}

function buildResolutionRecordCard(record: ResolutionRecord, index: number): ReportDetailCardBlock | null {
  const rootCauseId = compactValue(record.root_cause_id)
  const title = rootCauseId ? `Resolution Record: ${rootCauseId}` : `Resolution Record ${index + 1}`
  const rootCauseStatement = buildParagraphSection("Root Cause", record.root_cause_statement)
  const groups: ReportDetailCardGroup[] = []

  const correctionRows = buildMetadataRows([
    ["Decision", formatResolutionStatusLabel(record.correction?.decision)],
    ["Status", formatResolutionStatusLabel(record.correction?.status)],
    ["Owner", record.correction?.owner],
    ["Due Date", record.correction?.due_date],
    ["Justification", record.correction?.justification],
    ["Impacted Items", record.correction?.impacted_items],
    ["Actions", record.correction?.actions],
    ["Objective Evidence", record.correction?.objective_evidence],
    ["Acceptance Criteria", record.correction?.acceptance_criteria],
  ])
  if (correctionRows.length) {
    groups.push({ title: "Correction", metadata: correctionRows })
  }

  const correctiveRows = buildMetadataRows([
    ["Decision", formatResolutionStatusLabel(record.corrective_action?.decision)],
    ["Status", formatResolutionStatusLabel(record.corrective_action?.status)],
    ["Owner", record.corrective_action?.owner],
    ["Due Date", record.corrective_action?.due_date],
    ["Justification", record.corrective_action?.justification],
    ["Linked Root Causes", record.corrective_action?.linked_root_causes],
    ["Linked Causal Factors", record.corrective_action?.linked_causal_factors],
    ["Implementation Plan", record.corrective_action?.implementation_plan],
    ["Expected Outcome", record.corrective_action?.expected_outcome],
  ])
  if (correctiveRows.length) {
    groups.push({ title: "Corrective Action", metadata: correctiveRows })
  }

  const preventiveRows = buildMetadataRows([
    ["Decision", formatResolutionStatusLabel(record.preventive_action?.decision)],
    ["Status", formatResolutionStatusLabel(record.preventive_action?.status)],
    ["Owner", record.preventive_action?.owner],
    ["Due Date", record.preventive_action?.due_date],
    ["Justification", record.preventive_action?.justification],
    ["Linked Root Causes", record.preventive_action?.linked_root_causes],
    ["Linked Causal Factors", record.preventive_action?.linked_causal_factors],
    ["Implementation Plan", record.preventive_action?.implementation_plan],
    ["Expected Outcome", record.preventive_action?.expected_outcome],
  ])
  if (preventiveRows.length) {
    groups.push({ title: "Preventive Action", metadata: preventiveRows })
  }

  const effectivenessRows = buildMetadataRows([
    ["Required", record.effectiveness_plan?.required],
    ["Status", formatResolutionStatusLabel(record.effectiveness_plan?.status)],
    ["Owner", record.effectiveness_plan?.owner],
    ["Goal", record.effectiveness_plan?.goal],
    ["Method", record.effectiveness_plan?.method],
    ["Data Source", record.effectiveness_plan?.data_source],
    ["Analysis Method", record.effectiveness_plan?.analysis_method],
    ["Sample Size", record.effectiveness_plan?.sample_size],
    ["Duration", record.effectiveness_plan?.duration],
    ["Success Criteria", record.effectiveness_plan?.success_criteria],
    ["Adverse Effect Review", record.effectiveness_plan?.adverse_effect_review],
  ])
  if (effectivenessRows.length) {
    groups.push({ title: "Effectiveness Plan", metadata: effectivenessRows })
  }

  const sections: ReportCardSection[] = []
  const reviewNotes = buildListSection("Review Notes", record.review_notes)
  if (reviewNotes) sections.push(reviewNotes)

  const hasContent = Boolean(rootCauseId || record.root_cause_statement || groups.length || sections.length || record.status !== "not_started")
  if (!hasContent) {
    return null
  }

  return {
    kind: "detailCard",
    variant: "resolutionRecord",
    title,
    subtitle: `Status: ${formatResolutionStatusLabel(record.status)}`,
    status: record.status,
    groups,
    sections: rootCauseStatement ? [rootCauseStatement, ...sections] : sections,
  }
}

function buildResolutionPlanSection(workspace: WorkspaceCase) {
  const plan = workspace.resolution_plan || null
  if (!plan) return null

  const summaryRows: ReportKeyValueRow[] = []
  pushRow(summaryRows, "Status", plan.status)
  pushRow(summaryRows, "Review Notes", plan.review_notes)
  const summaryBlock = keyValueBlock("Resolution Plan Summary", summaryRows)

  const validation = isRecord(workspace.resolution_plan_validation) ? workspace.resolution_plan_validation : null
  const alignment = isRecord(workspace.resolution_alignment) ? workspace.resolution_alignment : null
  const validationBlock = validation ? keyValueBlock("Resolution Plan Validation", buildMetadataRows([
    ["Status", validation.status],
    ["Pass", validation.pass],
    ["Warnings", (validation.warnings || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
    ["Missing Fields", (validation.missing_fields || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
    ["Recommendations", (validation.recommendations || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
  ])) : null
  const alignmentBlock = alignment ? keyValueBlock("Resolution Alignment", buildMetadataRows([
    ["Overall Status", alignment.overall_status],
    ["Readiness for Downstream CAPA Drafting", alignment.readiness_for_downstream_capa_drafting],
    ["Warnings", (alignment.warnings || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
    ["Missing Fields", (alignment.missing_fields || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
    ["Recommendations", (alignment.recommendations || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
  ])) : null

  const recordBlocks = (plan.resolution_records || [])
    .map((record, index) => buildResolutionRecordCard(record, index))
    .filter((block): block is ReportDetailCardBlock => Boolean(block))

  const blocks = [summaryBlock, validationBlock, alignmentBlock, ...recordBlocks].filter(Boolean) as ReportBlock[]
  return section("Resolution Plan", blocks)
}

function buildCapaDraftRecordCard(record: NonNullable<CAPADraft["records"]>[number], index: number): ReportDetailCardBlock | null {
  const rootCauseId = compactValue(record.root_cause_id)
  const title = rootCauseId ? `CAPA Draft: ${rootCauseId}` : `CAPA Draft ${index + 1}`
  const groups: ReportDetailCardGroup[] = []

  const correctionRows = buildMetadataRows([
    ["Decision", formatResolutionStatusLabel(record.correction_draft?.decision)],
    ["Owner", record.correction_draft?.owner],
    ["Due Date", record.correction_draft?.due_date],
    ["Status", formatCapaDraftStatusLabel(record.correction_draft?.status)],
  ])
  const correctionSections = [
    buildNarrativeSection("Statement", record.correction_draft?.statement),
    buildNarrativeSection("Justification", record.correction_draft?.justification),
    buildNarrativeSection("Objective Evidence", record.correction_draft?.objective_evidence),
    buildNarrativeSection("Acceptance Criteria", record.correction_draft?.acceptance_criteria),
  ].filter((section): section is ReportCardSection => Boolean(section))
  if (correctionRows.length || correctionSections.length) {
    groups.push({ title: "Correction Draft", metadata: correctionRows, sections: correctionSections })
  }

  const correctiveRows = buildMetadataRows([
    ["Decision", formatResolutionStatusLabel(record.corrective_action_draft?.decision)],
    ["Owner", record.corrective_action_draft?.owner],
    ["Due Date", record.corrective_action_draft?.due_date],
    ["Status", formatCapaDraftStatusLabel(record.corrective_action_draft?.status)],
    ["Linked Root Causes", record.corrective_action_draft?.linked_root_causes],
    ["Linked Causal Factors", record.corrective_action_draft?.linked_causal_factors],
  ])
  const correctiveSections = [
    buildNarrativeSection("Statement", record.corrective_action_draft?.statement),
    buildNarrativeSection("Justification", record.corrective_action_draft?.justification),
    buildNarrativeSection("Implementation Plan", record.corrective_action_draft?.implementation_plan),
    buildNarrativeSection("Expected Outcome", record.corrective_action_draft?.expected_outcome),
  ].filter((section): section is ReportCardSection => Boolean(section))
  if (correctiveRows.length || correctiveSections.length) {
    groups.push({ title: "Corrective Action Draft", metadata: correctiveRows, sections: correctiveSections })
  }

  const preventiveRows = buildMetadataRows([
    ["Decision", formatResolutionStatusLabel(record.preventive_action_draft?.decision)],
    ["Owner", record.preventive_action_draft?.owner],
    ["Due Date", record.preventive_action_draft?.due_date],
    ["Status", formatCapaDraftStatusLabel(record.preventive_action_draft?.status)],
    ["Linked Root Causes", record.preventive_action_draft?.linked_root_causes],
    ["Linked Causal Factors", record.preventive_action_draft?.linked_causal_factors],
  ])
  const preventiveSections = [
    buildNarrativeSection("Statement", record.preventive_action_draft?.statement),
    buildNarrativeSection("Justification", record.preventive_action_draft?.justification),
    buildNarrativeSection("Implementation Plan", record.preventive_action_draft?.implementation_plan),
    buildNarrativeSection("Expected Outcome", record.preventive_action_draft?.expected_outcome),
  ].filter((section): section is ReportCardSection => Boolean(section))
  if (preventiveRows.length || preventiveSections.length) {
    groups.push({ title: "Preventive Action Draft", metadata: preventiveRows, sections: preventiveSections })
  }

  const effectivenessRows = buildMetadataRows([
    ["Required", record.effectiveness_draft?.required],
    ["Status", formatCapaDraftStatusLabel(record.effectiveness_draft?.status)],
    ["Owner", record.effectiveness_draft?.owner],
    ["Sample Size", record.effectiveness_draft?.sample_size],
    ["Duration", record.effectiveness_draft?.duration],
  ])
  const effectivenessSections = [
    buildNarrativeSection("Goal", record.effectiveness_draft?.goal),
    buildNarrativeSection("Method", record.effectiveness_draft?.method),
    buildNarrativeSection("Data Source", record.effectiveness_draft?.data_source),
    buildNarrativeSection("Analysis Method", record.effectiveness_draft?.analysis_method),
    buildNarrativeSection("Success Criteria", record.effectiveness_draft?.success_criteria),
    buildNarrativeSection("Adverse Effect Review", record.effectiveness_draft?.adverse_effect_review),
  ].filter((section): section is ReportCardSection => Boolean(section))
  if (effectivenessRows.length || effectivenessSections.length) {
    groups.push({ title: "Effectiveness Draft", metadata: effectivenessRows, sections: effectivenessSections })
  }

  const sections: ReportCardSection[] = []
  const missingInformation = buildListSection("Missing Information", (record.missing_fields || []).map((item) => humanizeMessagePaths(item)))
  if (missingInformation) sections.push(missingInformation)
  const warnings = buildListSection("Warnings", (record.warnings || []).map((item) => humanizeMessagePaths(item)))
  if (warnings) sections.push(warnings)

  const hasContent = Boolean(rootCauseId || groups.length || sections.length || record.alignment_status !== "not_started" || record.ready_for_review)
  if (!hasContent) {
    return null
  }

  return {
    kind: "detailCard",
    variant: "capaDraftRecord",
    title,
    subtitle: `Alignment Status: ${formatCapaDraftStatusLabel(record.alignment_status)}`,
    status: record.alignment_status,
    groups,
    sections,
  }
}

function buildCapaLevelAssignmentCard(assignment: NonNullable<CAPALevelSummary["assignments"]>[number], index: number): ReportDetailCardBlock | null {
  const targetId = compactValue(assignment.target_id)
  const title = targetId ? `CAPA Level Assignment: ${targetId} ${formatCapaLevelTargetType(assignment.target_type)}` : `CAPA Level Assignment ${index + 1}`
  const metadata = buildMetadataRows([
    ["Assigned Level", formatCapaLevelLabel(assignment.assigned_level)],
    ["Assigned Category", formatCapaLevelCategory(assignment.assigned_category)],
    ["Confidence", formatCapaLevelConfidence(assignment.confidence)],
    ["Status", formatCapaLevelStatusLabel(assignment.status)],
  ])

  const sections: ReportCardSection[] = []
  const rationale = buildParagraphSection("Rationale", assignment.rationale)
  if (rationale) sections.push(rationale)
  const evidence = buildUniqueHumanizedListSection(
    "Evidence",
    [
      ...(assignment.evidence_refs || []),
      ...(assignment.evidence || []).map((item) => compactValue(item.source_ref || item.source_text || item.source_type || item.notes)),
    ],
  )
  if (evidence) sections.push(evidence)
  const warnings = buildListSection("Warnings", (assignment.warnings || []).map((item) => humanizeMessagePaths(item)))
  if (warnings) sections.push(warnings)

  const hasContent = Boolean(targetId || metadata.length || sections.length)
  if (!hasContent) {
    return null
  }

  return {
    kind: "detailCard",
    variant: "capaLevelAssignment",
    title,
    metadata,
    sections,
    status: assignment.status,
  }
}

function buildCapaLevelReviewCard(record: NonNullable<CAPALevelReview["record_reviews"]>[number], index: number): ReportDetailCardBlock | null {
  const identifier = compactValue(record.root_cause_id || record.record_id)
  const title = identifier ? `CAPA Level Review: ${identifier}` : `CAPA Level Review ${index + 1}`
  const metadata = buildMetadataRows([
    ["Review Result", formatCapaLevelReviewResult(record.review_result)],
    ["Assigned Level", formatCapaLevelLabel(record.assigned_level)],
    ["Assigned Category", formatCapaLevelCategory(record.assigned_category)],
    ["Confidence", formatCapaLevelConfidence(record.confidence)],
    ["Status", formatCapaLevelReviewStatusLabel(record.status)],
    ["Ready for Review", record.ready_for_review],
  ])

  const sections: ReportCardSection[] = []
  const mismatches = buildListSection(
    "Mismatches",
    (record.mismatches || []).map((item) => [
      humanizeMessagePaths(item.field_name),
      item.mismatch_type,
      item.severity ? `(${item.severity})` : "",
      item.details,
    ].filter(Boolean).join(" · ")),
  )
  if (mismatches) sections.push(mismatches)
  const warnings = buildListSection("Warnings", (record.warnings || []).map((item) => humanizeMessagePaths(item)))
  if (warnings) sections.push(warnings)
  const recommendations = buildListSection("Recommendations", (record.recommendations || []).map((item) => humanizeMessagePaths(item)))
  if (recommendations) sections.push(recommendations)
  const reviewNotes = buildListSection("Review Notes", (record.review_notes || []).map((item) => humanizeMessagePaths(item)))
  if (reviewNotes) sections.push(reviewNotes)

  const hasContent = Boolean(identifier || metadata.length || sections.length)
  if (!hasContent) {
    return null
  }

  return {
    kind: "detailCard",
    variant: "capaLevelReview",
    title,
    metadata,
    sections,
    status: record.status,
  }
}

function buildCapaDraftSection(workspace: WorkspaceCase) {
  const draft = workspace.capa_draft || null
  if (!draft) return null

  const summaryRows: ReportKeyValueRow[] = []
  pushRow(summaryRows, "Status", draft.status)
  pushRow(summaryRows, "Summary", draft.summary)
  pushRow(summaryRows, "Review Notes", draft.review_notes)
  pushRow(summaryRows, "Ready for Review", draft.ready_for_review)
  const summaryBlock = keyValueBlock("CAPA Draft Summary", summaryRows)

  const validation = isRecord(workspace.capa_draft_validation) ? workspace.capa_draft_validation : null
  const validationBlock = validation ? keyValueBlock("CAPA Draft Validation", buildMetadataRows([
    ["Status", validation.status],
    ["Pass", validation.pass],
    ["Warnings", (validation.warnings || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
    ["Missing Fields", (validation.missing_fields || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
    ["Recommendations", (validation.recommendations || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
  ])) : null

  const recordBlocks = (draft.records || [])
    .map((record, index) => buildCapaDraftRecordCard(record, index))
    .filter((block): block is ReportDetailCardBlock => Boolean(block))

  const blocks = [summaryBlock, validationBlock, ...recordBlocks].filter(Boolean) as ReportBlock[]
  return section("CAPA Draft", blocks)
}

function buildCapaLevelSection(workspace: WorkspaceCase) {
  const summary = workspace.capa_level_summary || null
  const review = workspace.capa_level_review || null
  if (!summary && !review) return null

  const blocks: ReportBlock[] = []
  if (summary) {
    const summaryRows: ReportKeyValueRow[] = []
    pushRow(summaryRows, "Status", summary.status)
    pushRow(summaryRows, "Summary", summary.summary)
    pushRow(summaryRows, "Ready for Review", summary.ready_for_review)
    pushRow(summaryRows, "Warnings", (summary.warnings || []).map((item) => humanizeMessagePaths(item)).join(" • "))
    pushRow(summaryRows, "Missing Fields", (summary.missing_fields || []).map((item) => humanizeMessagePaths(item)).join(" • "))
    const summaryBlock = keyValueBlock("CAPA Level Summary", summaryRows)
    if (summaryBlock) blocks.push(summaryBlock)

    const validation = isRecord(workspace.capa_level_validation) ? workspace.capa_level_validation : null
    const validationBlock = validation ? keyValueBlock("CAPA Level Validation", buildMetadataRows([
      ["Status", validation.status],
      ["Pass", validation.pass],
      ["Warnings", (validation.warnings || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
      ["Missing Fields", (validation.missing_fields || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
      ["Recommendations", (validation.recommendations || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
    ])) : null
    if (validationBlock) blocks.push(validationBlock)

    const assignmentBlocks = (summary.assignments || [])
      .map((assignment, index) => buildCapaLevelAssignmentCard(assignment, index))
      .filter((block): block is ReportDetailCardBlock => Boolean(block))
    blocks.push(...assignmentBlocks)
  }

  if (review) {
    const reviewRows: ReportKeyValueRow[] = []
    pushRow(reviewRows, "Status", review.status)
    pushRow(reviewRows, "Overall Pass", review.overall_pass)
    pushRow(reviewRows, "Overall Ready", review.overall_ready)
    pushRow(reviewRows, "Summary", review.summary)
    pushRow(reviewRows, "Review Notes", review.review_notes)
    pushRow(reviewRows, "Warnings", (review.warnings || []).map((item) => humanizeMessagePaths(item)).join(" • "))
    pushRow(reviewRows, "Recommendations", (review.recommendations || []).map((item) => humanizeMessagePaths(item)).join(" • "))
    const reviewBlock = keyValueBlock("CAPA Level Review", reviewRows)
    if (reviewBlock) blocks.push(reviewBlock)

    const reviewValidation = isRecord(workspace.capa_level_review_validation) ? workspace.capa_level_review_validation : null
    const reviewValidationBlock = reviewValidation ? keyValueBlock("CAPA Level Review Validation", buildMetadataRows([
      ["Status", reviewValidation.status],
      ["Pass", reviewValidation.pass],
      ["Warnings", (reviewValidation.warnings || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
      ["Missing Fields", (reviewValidation.missing_fields || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
      ["Recommendations", (reviewValidation.recommendations || []).map((item) => humanizeMessagePaths(item)).join(" • ")],
    ])) : null
    if (reviewValidationBlock) blocks.push(reviewValidationBlock)

    const recordReviewBlocks = (review.record_reviews || [])
      .map((item, index) => buildCapaLevelReviewCard(item, index))
      .filter((block): block is ReportDetailCardBlock => Boolean(block))
    blocks.push(...recordReviewBlocks)
  }

  return section("CAPA Level", blocks)
}

function buildConclusionSection(workspace: WorkspaceCase) {
  const conclusion = workspace.conclusion
  if (typeof conclusion === "string") {
    return section("Conclusion", [
      {
        kind: "paragraphs",
        title: "Conclusion",
        paragraphs: asLines(conclusion),
      },
    ])
  }

  if (!isRecord(conclusion)) return null

  const rows = compactMetadataRows(conclusion)
  if (!rows.length) return null

  return section("Conclusion", [
    {
      kind: "keyValue",
      title: "Conclusion",
      rows,
    },
  ])
}

export function buildInvestigationReport(workspace: WorkspaceCase | null | undefined, caseId?: string, generatedAt = new Date()): InvestigationReport {
  const caseKey = caseId || workspace?.case_id || "Not available"
  const sections: ReportSection[] = []
  const source = workspace || { case_id: caseKey, evidence: [], facts: { accepted: [], proposed: [], rejected: [] } } as WorkspaceCase

  const orderedSections = [
    buildCaseInformationSection(source),
    buildInvestigationNarrativeSection("Event Description", source.case_intake?.detailed_description || (isRecord(source.investigation) ? source.investigation.detailed_description : source.investigation)),
    buildInvestigationNarrativeSection("Immediate Actions / Containment", source.case_intake?.immediate_action_taken || (isRecord(source.investigation) ? source.investigation.immediate_actions : undefined)),
    buildBackgroundInformationSection(source.background_information),
    buildEvidenceSection(source),
    buildAcceptedFactsSection(source),
    buildSequenceSection(source.sequence_of_events),
    buildInvestigationNarrativeSection("Investigation Findings", source.investigation),
    buildHistoricalReviewSection(source),
    buildRootCauseSection(source),
    buildImpactRiskSection(source),
    buildResolutionPlanSection(source),
    buildCapaDraftSection(source),
    buildCapaLevelSection(source),
    buildConclusionSection(source),
  ]

  for (const reportSection of orderedSections) {
    if (reportSection) {
      sections.push(reportSection)
    }
  }

  return {
    title: "Investigation Report",
    caseId: caseKey,
    generatedAtIso: generatedAt.toISOString(),
    disclaimer: REPORT_DISCLAIMER,
    sections,
  }
}
