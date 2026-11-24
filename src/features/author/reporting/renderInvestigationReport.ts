import type {
  InvestigationReport,
  ReportBlock,
  ReportCardSection,
  ReportDetailCardBlock,
  ReportDetailCardGroup,
  ReportHistoricalReviewEvaluationCardBlock,
  ReportHistoricalReviewRecordCardBlock,
  ReportSequenceEventsBlock,
  ReportSection,
} from "./reportModel"
import { REPORT_PRINT_STYLES } from "./reportStyles"

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function renderParagraphs(block: Extract<ReportBlock, { kind: "paragraphs" }>) {
  return `<div class="block paragraphs"${block.title ? ` aria-label="${escapeHtml(block.title)}"` : ""}>${
    block.title ? `<h3 class="block-title">${escapeHtml(block.title)}</h3>` : ""
  }${block.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>`
}

function renderKeyValue(block: Extract<ReportBlock, { kind: "keyValue" }>) {
  return `<div class="block key-value"${block.title ? ` aria-label="${escapeHtml(block.title)}"` : ""}>${
    block.title ? `<h3 class="block-title">${escapeHtml(block.title)}</h3>` : ""
  }<table class="key-value"><tbody>${
    block.rows.map((row) => `<tr><td class="label">${escapeHtml(row.label)}</td><td class="value">${escapeHtml(row.value)}</td></tr>`).join("")
  }</tbody></table></div>`
}

function renderTable(block: Extract<ReportBlock, { kind: "table" }>) {
  return `<div class="block table-block"${block.title ? ` aria-label="${escapeHtml(block.title)}"` : ""}>${
    block.title ? `<h3 class="block-title">${escapeHtml(block.title)}</h3>` : ""
  }<table><thead><tr>${block.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${
    block.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")
  }</tbody></table></div>`
}

function renderCardSection(section: ReportCardSection) {
  if (section.kind === "list") {
    return `<section class="historical-review-card-section" data-card-section="${escapeHtml(section.title)}">`
      + `<h4 class="historical-review-card-section-title">${escapeHtml(section.title)}</h4>`
      + `<ul class="historical-review-card-list">${(section.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      + `</section>`
  }

  return `<section class="historical-review-card-section historical-review-card-section--narrative" data-card-section="${escapeHtml(section.title)}">`
    + `<h4 class="historical-review-card-section-title">${escapeHtml(section.title)}</h4>`
    + `${(section.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}`
    + `</section>`
}

function renderHistoricalReviewMetadata(title: string, metadata: Array<{ label: string; value: string }>, recordId: string) {
  if (!metadata.length) {
    return ""
  }

  return `<div class="historical-review-card-metadata" data-card-metadata="${escapeHtml(title)}" data-record-id="${escapeHtml(recordId)}">`
    + metadata
      .map(
        (row) => `<div class="historical-review-card-metadata-item"><div class="historical-review-card-label">${escapeHtml(row.label)}</div><div class="historical-review-card-value">${escapeHtml(row.value)}</div></div>`,
      )
      .join("")
    + `</div>`
}

function renderHistoricalReviewRecordCard(block: ReportHistoricalReviewRecordCardBlock) {
  return `<article class="block historical-review-card historical-review-card--record" data-card-kind="historical-record" data-record-id="${escapeHtml(block.recordId)}">`
    + `<h3 class="block-title historical-review-card-title">${escapeHtml(block.title)}</h3>`
    + renderHistoricalReviewMetadata(block.title, block.metadata, block.recordId)
    + block.sections.map((section) => renderCardSection(section)).join("")
    + `</article>`
}

function renderHistoricalReviewEvaluationCard(block: ReportHistoricalReviewEvaluationCardBlock) {
  return `<article class="block historical-review-card historical-review-card--evaluation" data-card-kind="historical-review-evaluation" data-record-id="${escapeHtml(block.recordId)}">`
    + `<h3 class="block-title historical-review-card-title">${escapeHtml(block.title)}</h3>`
    + renderHistoricalReviewMetadata(block.title, block.metadata, block.recordId)
    + block.sections.map((section) => renderCardSection(section)).join("")
    + `</article>`
}

function formatResolutionStatusLabel(value?: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  const map: Record<string, string> = {
    not_started: "Not started",
    draft: "Draft",
    ready_for_review: "Ready for review",
    approved: "Approved",
    required: "Required",
    not_required: "Not required",
  }
  return map[normalized] || normalized.replace(/_/g, " ").replace(/^./, (character) => character.toUpperCase())
}

function formatCapaLevelLabel(value?: unknown) {
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

function formatCapaLevelCategory(value?: unknown) {
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

function formatCapaLevelConfidence(value?: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  const map: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
  }
  return map[normalized] || "Not provided"
}

function formatCapaLevelReviewResult(value?: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  const map: Record<string, string> = {
    pass: "Pass",
    review: "Review",
    fail: "Fail",
  }
  return map[normalized] || "Review"
}

function formatCapaLevelReviewStatusLabel(value?: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  const map: Record<string, string> = {
    not_started: "Not started",
    draft: "Draft",
    ready_for_review: "Ready for review",
    approved: "Reviewed",
  }
  return map[normalized] || normalized.replace(/_/g, " ").replace(/^./, (character) => character.toUpperCase())
}

function formatCapaLevelTargetType(value?: unknown) {
  const normalized = String(value || "").trim().toLowerCase()
  const map: Record<string, string> = {
    correction_draft: "Correction",
    corrective_action_draft: "Corrective Action",
    preventive_action_draft: "Preventive Action",
    effectiveness_draft: "Effectiveness",
  }
  return map[normalized] || normalized.replace(/_/g, " ").replace(/^./, (character) => character.toUpperCase())
}

function renderMetadataRows(rows: Array<{ label: string; value: string }>, className = "detail-card-metadata") {
  if (!rows.length) {
    return ""
  }

  return `<div class="${className}">${rows
    .map(
      (row) =>
        `<div class="${className}-item"><div class="${className}-label">${escapeHtml(row.label)}</div><div class="${className}-value">${escapeHtml(row.value)}</div></div>`,
    )
    .join("")}</div>`
}

function renderDetailCardGroup(group: ReportDetailCardGroup) {
  const metadata = group.metadata ? renderMetadataRows(group.metadata, "detail-card-group-metadata") : ""
  const sections = (group.sections || []).map((section) => renderCardSection(section)).join("")
  if (!metadata && !sections) {
    return ""
  }

  return `<section class="detail-card-group"><h4 class="detail-card-group-title">${escapeHtml(group.title)}</h4>${metadata}${sections}</section>`
}

function renderDetailCard(block: ReportDetailCardBlock) {
  const metadata = block.metadata ? renderMetadataRows(block.metadata) : ""
  const groups = (block.groups || []).map((group) => renderDetailCardGroup(group)).join("")
  const sections = (block.sections || []).map((section) => renderCardSection(section)).join("")
  const subtitle = block.subtitle ? `<p class="detail-card-subtitle">${escapeHtml(block.subtitle)}</p>` : ""
  const status = block.status ? `<span class="detail-card-status">${escapeHtml(formatResolutionStatusLabel(block.status))}</span>` : ""
  return `<article class="block detail-card detail-card--${escapeHtml(block.variant || "generic")}" data-detail-card-kind="${escapeHtml(block.variant || "generic")}">`
    + `<div class="detail-card-header"><div class="detail-card-heading"><h3 class="block-title detail-card-title">${escapeHtml(block.title)}</h3>${subtitle}</div>${status}</div>`
    + metadata
    + groups
    + sections
    + `</article>`
}

function formatSequenceConfidence(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return ""
  }

  const clamped = Math.max(0, Math.min(1, value))
  return `${Math.round(clamped * 100)}%`
}

function formatSequenceReviewStatus(value?: string) {
  const normalized = String(value || "").trim().toLowerCase()
  if (!normalized || normalized === "keep") return ""
  if (normalized === "candidate_review") return "Candidate Review"
  if (normalized === "candidate_drop") return "Candidate Drop"
  if (normalized === "invalid_unrenderable") return "Invalid / Unrenderable"
  return normalized.replace(/_/g, " ").replace(/^./, (character) => character.toUpperCase())
}

function formatConfidence(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return ""
  }

  const clamped = Math.max(0, Math.min(1, value))
  return `${Math.round(clamped * 100)}%`
}

function formatHumanReviewRequired(value: boolean | undefined) {
  if (value === true) return "Yes"
  if (value === false) return "No"
  return "Not available"
}

function renderList(items: string[], className: string) {
  if (!items.length) {
    return ""
  }

  return `<ul class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
}

function renderTraceability(traceability: string[]) {
  if (!traceability.length) {
    return `<div class="sequence-events-empty">Not available</div>`
  }

  return `<div class="sequence-events-traceability"><div class="sequence-events-traceability-label">Traceability</div><div class="sequence-events-traceability-value">${escapeHtml(traceability.join(", "))}</div></div>`
}

function renderSequenceEvents(block: ReportSequenceEventsBlock) {
  const rows = block.events.map((event) => {
    const reviewStatus = formatSequenceReviewStatus(event.reviewStatus)
    const confidence = formatSequenceConfidence(event.confidence)
    const reviewReason = String(event.reviewReason || "").trim()
    const showReview = Boolean(reviewStatus || reviewReason)
    const displayDate = event.dateTime || "Unknown"
    const eventText = event.event || "Not available"

    return `
      <tr class="sequence-events-row${showReview ? " sequence-events-row--review" : ""}" data-sequence-event-row="true">
        <td class="sequence-events-cell sequence-events-date">${escapeHtml(displayDate)}</td>
        <td class="sequence-events-cell sequence-events-event">
          <div class="sequence-events-event-text">${escapeHtml(eventText)}</div>
          ${showReview ? `<div class="sequence-events-review">
            <div class="sequence-events-review-title">Review Required</div>
            ${reviewStatus ? `<div class="sequence-events-review-line"><span class="sequence-events-review-label">Status:</span><span class="sequence-events-review-value">${escapeHtml(reviewStatus)}</span></div>` : ""}
            ${reviewReason ? `<div class="sequence-events-review-line"><span class="sequence-events-review-label">Reason:</span><span class="sequence-events-review-value">${escapeHtml(reviewReason)}</span></div>` : ""}
          </div>` : ""}
        </td>
        <td class="sequence-events-cell sequence-events-traceability-cell">
          ${renderTraceability(event.traceability)}
          ${confidence ? `<div class="sequence-events-confidence">Confidence: ${escapeHtml(confidence)}</div>` : ""}
        </td>
      </tr>
    `
  }).join("")

  return `<div class="block sequence-events"${block.title ? ` aria-label="${escapeHtml(block.title)}"` : ""}>${
    block.title ? `<h3 class="block-title">${escapeHtml(block.title)}</h3>` : ""
  }<table class="sequence-events-table"><colgroup><col class="sequence-events-col-date" /><col class="sequence-events-col-event" /><col class="sequence-events-col-traceability" /></colgroup><thead><tr><th>Date / Time</th><th>Event</th><th>Traceability</th></tr></thead><tbody>${rows}</tbody></table></div>`
}

function renderFiveWhys(block: Extract<ReportBlock, { kind: "fiveWhys" }>) {
  const fiveWhys = block.fiveWhys

  return `<div class="block five-whys"${block.title ? ` aria-label="${escapeHtml(block.title)}"` : ""}>${
    block.title ? `<h3 class="block-title">${escapeHtml(block.title)}</h3>` : ""
  }<div class="five-whys-body">${
    fiveWhys.problemStatement
      ? `<div class="five-whys-panel"><div class="five-whys-label">Problem Statement</div><p class="five-whys-text">${escapeHtml(fiveWhys.problemStatement)}</p></div>`
      : ""
  }${
    fiveWhys.steps.map((step) => `
      <div class="five-whys-panel five-whys-step">
        <h4 class="five-whys-step-title">Why ${escapeHtml(step.whyNumber)}</h4>
        <div class="five-whys-label">Question</div>
        <p class="five-whys-text">${escapeHtml(step.question)}</p>
        <div class="five-whys-label">Answer</div>
        <p class="five-whys-text">${escapeHtml(step.answer)}</p>
        ${step.supportingEvidenceIds.length ? `<div class="five-whys-label">Supporting Evidence</div><p class="five-whys-text">${escapeHtml(step.supportingEvidenceIds.join(", "))}</p>` : ""}
        ${formatConfidence(step.confidence) ? `<div class="five-whys-label">Confidence</div><p class="five-whys-text">${escapeHtml(formatConfidence(step.confidence))}</p>` : ""}
      </div>
    `).join("")
  }${
    fiveWhys.finalRootCause || formatConfidence(fiveWhys.confidence)
      ? `<div class="five-whys-panel"><div class="five-whys-label">Final Root Cause</div><p class="five-whys-text">${escapeHtml(fiveWhys.finalRootCause || "")}</p>${
          formatConfidence(fiveWhys.confidence) ? `<div class="five-whys-label">Confidence</div><p class="five-whys-text">${escapeHtml(formatConfidence(fiveWhys.confidence))}</p>` : ""
        }</div>`
      : ""
  }${
    `<div class="five-whys-panel"><div class="five-whys-label">Human Review Required</div><p class="five-whys-text">${escapeHtml(formatHumanReviewRequired(fiveWhys.humanReviewRequired))}</p></div>`
  }${
    fiveWhys.reasoningSummary
      ? `<div class="five-whys-panel"><div class="five-whys-label">Reasoning Summary</div><p class="five-whys-text">${escapeHtml(fiveWhys.reasoningSummary)}</p></div>`
      : ""
  }${
    fiveWhys.evidenceSummary
      ? `<div class="five-whys-panel"><div class="five-whys-label">Evidence Summary</div><p class="five-whys-text">${escapeHtml(fiveWhys.evidenceSummary)}</p></div>`
      : ""
  }${
    fiveWhys.evidenceGaps.length
      ? `<div class="five-whys-panel"><div class="five-whys-label">Evidence Gaps</div>${renderList(fiveWhys.evidenceGaps, "five-whys-list")}</div>`
      : ""
  }${
    fiveWhys.assumptions.length
      ? `<div class="five-whys-panel"><div class="five-whys-label">Assumptions</div>${renderList(fiveWhys.assumptions, "five-whys-list")}</div>`
      : ""
  }${
    fiveWhys.supportingFactIds.length
      ? `<div class="five-whys-panel"><div class="five-whys-label">Supporting Fact IDs</div><p class="five-whys-text">${escapeHtml(fiveWhys.supportingFactIds.join(", "))}</p></div>`
      : ""
  }${
    fiveWhys.supportingSectionIds.length
      ? `<div class="five-whys-panel"><div class="five-whys-label">Supporting Section IDs</div><p class="five-whys-text">${escapeHtml(fiveWhys.supportingSectionIds.join(", "))}</p></div>`
      : ""
  }</div></div>`
}

function renderBlock(block: ReportBlock) {
  if (block.kind === "paragraphs") return renderParagraphs(block)
  if (block.kind === "keyValue") return renderKeyValue(block)
  if (block.kind === "detailCard") return renderDetailCard(block)
  if (block.kind === "sequenceEvents") return renderSequenceEvents(block)
  if (block.kind === "fiveWhys") return renderFiveWhys(block)
  if (block.kind === "historicalRecordCard") return renderHistoricalReviewRecordCard(block)
  if (block.kind === "historicalReviewEvaluationCard") return renderHistoricalReviewEvaluationCard(block)
  return renderTable(block)
}

function renderSection(section: ReportSection) {
  return `<section class="section"><h2 class="section-title">${escapeHtml(section.title)}</h2>${section.blocks.map((block) => renderBlock(block)).join("")}</section>`
}

export function createInvestigationReportDocument(report: InvestigationReport) {
  const generatedAt = new Date(report.generatedAtIso)
  const generatedAtLabel = Number.isNaN(generatedAt.getTime()) ? report.generatedAtIso : generatedAt.toLocaleString()
  const sections = report.sections.filter((section): section is ReportSection => Boolean(section))

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(report.title)} - ${escapeHtml(report.caseId)}</title>
    <style>${REPORT_PRINT_STYLES}</style>
  </head>
  <body>
    <div class="report">
      <div class="masthead">
        <h1>${escapeHtml(report.title)}</h1>
        <p class="meta">Case: ${escapeHtml(report.caseId)}<br />Generated: ${escapeHtml(generatedAtLabel)}</p>
      </div>
      ${sections.map((section) => renderSection(section)).join("")}
      <p class="footer">${escapeHtml(report.disclaimer)}</p>
    </div>
  </body>
</html>`
}

export function renderInvestigationReport(report: InvestigationReport) {
  return createInvestigationReportDocument(report)
}
