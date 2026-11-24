import type {
  CaseSummaryView,
  HistoricalReviewSearchPage,
  SavedCaseSummary,
  WorkspaceCase,
  WorkspaceFact,
} from "./workspace";
import type { DraftEntry } from "./drafts";
import type { TrackWiseRecord } from "./trackwise";

export const DEMO_CASE_ID = "DEMO-PR-2026-0142";

const now = "2026-10-26T14:30:00.000Z";

const trackWiseRecords: TrackWiseRecord[] = [
  {
    pr_id: "PR-2026-0142",
    assigned_to: "Maya Chen",
    short_description: "Bioreactor temperature excursion during hold",
    tw_v_detailed_description:
      "On 18 October 2026, the BR-04 harvest hold temperature reached 9.1°C for 47 minutes against the approved 2–8°C range. The excursion began after a planned utility switchover and was identified by the control-room high-temperature alarm.",
    tw_v_immediate_action_taken:
      "The batch was placed on quality hold, BR-04 was isolated, backup chilled water was restored, and Quality was notified. No material was released or transferred during the excursion.",
    rapid_status: "already_completed",
    site: "Cambridge North",
    current_state: "Investigation",
    date_opened: "2026-10-18",
    date_due: "2026-11-17",
    days_remaining: 22,
  },
  {
    pr_id: "PR-2026-0097",
    assigned_to: "Maya Chen",
    short_description: "Delayed response to cold-room alarm",
    detailed_description:
      "A cold-room high-temperature alarm remained unacknowledged for 18 minutes during second shift.",
    immediate_action_taken:
      "Materials were segregated and temperature history was sent to Quality for assessment.",
    rapid_status: "required",
    site: "Cambridge North",
    current_state: "Closed",
    date_opened: "2026-07-08",
    date_due: "2026-08-07",
    days_remaining: 0,
  },
  {
    pr_id: "PR-2026-0188",
    assigned_to: "Jon Bell",
    short_description: "Missing verification signature on line clearance",
    detailed_description:
      "A completed packaging line-clearance form was found without the required verifier signature.",
    immediate_action_taken:
      "Packaging was paused and the line-clearance activities were independently repeated.",
    rapid_status: "not_required",
    site: "Rockville",
    current_state: "Quality Review",
    date_opened: "2026-10-23",
    date_due: "2026-11-22",
    days_remaining: 27,
  },
];

const acceptedFacts: WorkspaceFact[] = [
  {
    fact_id: "F-001",
    statement: "BR-04 temperature reached 9.1°C for 47 minutes on 18 October 2026.",
    category: "Event",
    confidence: 0.98,
    evidence_id: "E-001",
    evidence_title: "Case Intake",
    source_type: "case_intake",
    source_excerpt: "reached 9.1°C for 47 minutes",
    status: "accepted",
  },
  {
    fact_id: "F-002",
    statement: "The excursion began after a planned chilled-water utility switchover.",
    category: "Sequence",
    confidence: 0.94,
    evidence_id: "E-002",
    evidence_title: "BR-04 temperature trend.pdf",
    source_type: "uploaded_evidence",
    source_excerpt: "Utility switchover initiated at 14:02; temperature crossed 8°C at 14:11.",
    status: "accepted",
  },
  {
    fact_id: "F-003",
    statement: "No material was released or transferred during the excursion.",
    category: "Impact",
    confidence: 0.97,
    evidence_id: "E-003",
    evidence_title: "Batch disposition review.docx",
    source_type: "uploaded_evidence",
    source_excerpt: "Batch remains on quality hold; no downstream transfer occurred.",
    status: "accepted",
  },
];

function createDemoWorkspace(): WorkspaceCase {
  const record = trackWiseRecords[0];
  return {
    case_id: DEMO_CASE_ID,
    case_intake: {
      pr_id: record.pr_id,
      rapid_status: record.rapid_status,
      detailed_description: record.tw_v_detailed_description,
      immediate_action_taken: record.tw_v_immediate_action_taken,
      metadata: {
        assigned_to: record.assigned_to,
        site: record.site,
        current_state: record.current_state,
        date_opened: record.date_opened,
        date_due: record.date_due,
        days_remaining: record.days_remaining,
      },
      trackwise_record: { ...record },
    },
    evidence: [
      {
        evidence_id: "E-001",
        evidence_title: "Case Intake",
        source_type: "case_intake",
        source_name: "TrackWise",
        source_field: "Detailed Description",
        source_location: record.pr_id,
        category: "Case Intake",
        status: "ready",
        source_data: record.tw_v_detailed_description,
      },
      {
        evidence_id: "E-002",
        evidence_title: "BR-04 temperature trend.pdf",
        source_type: "uploaded_evidence",
        source_name: "Historian export",
        category: "Equipment",
        status: "ready",
        bytes: 284000,
        source_data:
          "14:02 utility switchover initiated. 14:11 temperature crossed 8°C. 14:36 peak 9.1°C. 14:58 returned below 8°C.",
      },
      {
        evidence_id: "E-003",
        evidence_title: "Batch disposition review.docx",
        source_type: "uploaded_evidence",
        source_name: "Quality review",
        category: "Batch Records",
        status: "ready",
        bytes: 92000,
        source_data:
          "Batch B26-104 remains on quality hold. No downstream transfer or release occurred.",
      },
      {
        evidence_id: "E-004",
        evidence_title: "Operator interview notes.docx",
        source_type: "uploaded_evidence",
        source_name: "Interview",
        category: "Interviews",
        status: "ready",
        bytes: 48000,
        source_data:
          "The operator followed the switchover checklist but the checklist did not include verification of automatic valve feedback.",
      },
    ],
    facts: { proposed: [], accepted: acceptedFacts, rejected: [] },
    background_information: {
      summary:
        "BR-04 supports the harvest hold step for synthetic batch B26-104. The approved hold range is 2–8°C.",
      process_context: [
        "A planned chilled-water utility switchover was performed during the hold.",
      ],
      equipment_utilities_context: [
        "BR-04 receives chilled water through an automatically actuated supply valve.",
      ],
      source_references: ["E-001", "E-002", "E-004"],
    },
    sequence_of_events: {
      status: "ready_for_review",
      events: [
        { time: "14:02", description: "Planned chilled-water switchover initiated.", evidence_ids: ["E-002"] },
        { time: "14:11", description: "BR-04 temperature exceeded 8°C.", evidence_ids: ["E-002"] },
        { time: "14:16", description: "High-temperature alarm acknowledged.", evidence_ids: ["E-002"] },
        { time: "14:58", description: "Temperature returned below 8°C.", evidence_ids: ["E-002"] },
      ],
    },
    investigation: {
      status: "ready_for_review",
      summary:
        "The utility switchover command completed, but the chilled-water supply valve did not return to its expected position. The checklist contained no independent valve-feedback verification.",
      evidence_reviewed: ["E-001", "E-002", "E-003", "E-004"],
      human_review_required: true,
    },
    data_and_evidence_collection: {
      summary: "Historian data, batch disposition, and operator interview records were reviewed.",
    },
    error_classification: {
      classification: "Procedure / system interaction",
      rationale: "The procedure did not require confirmation of automated valve feedback.",
    },
    health_hazard_assessment: {
      conclusion: "No direct patient exposure occurred because the batch remained on hold.",
    },
    impact_assessment: {
      product_impact: "No confirmed product impact; final disposition remains subject to qualified review.",
      process_impact: "The same switchover checklist is used on two comparable vessels.",
    },
    rca: {
      status: "ready_for_review",
      method_id: "five_whys",
      root_cause: {
        id: "RC-001",
        statement:
          "The utility switchover procedure did not require independent verification of chilled-water valve feedback.",
        classification: "Procedure",
        confidence: "medium" as const,
      },
      native: {
        five_whys: {
          problem_statement: "BR-04 exceeded the approved hold temperature range.",
          why_steps: [
            { why_number: 1, question: "Why did temperature rise?", answer: "Chilled-water flow was interrupted.", supporting_evidence_ids: ["E-002"] },
            { why_number: 2, question: "Why was flow interrupted?", answer: "The supply valve did not return to its expected position.", supporting_evidence_ids: ["E-002"] },
            { why_number: 3, question: "Why was this not detected immediately?", answer: "The switchover checklist did not require valve-feedback verification.", supporting_evidence_ids: ["E-004"] },
          ],
          final_root_cause:
            "The switchover procedure lacked an independent valve-feedback verification step.",
          evidence_gaps: ["Maintenance inspection of the valve actuator remains pending."],
          supporting_fact_ids: ["F-001", "F-002"],
        },
      },
    },
    root_cause: {
      id: "RC-001",
      status: "ready_for_review",
      statement:
        "The utility switchover procedure did not require independent verification of chilled-water valve feedback.",
    },
    historical_review: {
      source: "TrackWise",
      status: "completed",
      search_criteria: "Temperature excursions associated with chilled-water transfer or alarm response",
      timeframe: "October 2024 – October 2026",
      systems_searched: ["Synthetic TrackWise dataset"],
      records_reviewed: 3,
      summary:
        "One related non-repeat event involving delayed alarm response was identified. No confirmed repeat of the BR-04 valve-feedback failure was found.",
      impact_on_investigation:
        "The history supports evaluating both procedural controls and alarm response.",
      impact_on_risk: "A related alarm-response event increases recurrence likelihood to moderate.",
      impact_on_rca: "No prior event contradicts the proposed procedural root cause.",
      recommendations: ["Include alarm-response timing in effectiveness monitoring."],
      confidence: "medium",
      selected_records: [
        {
          pr_id: "PR-2026-0097",
          date_opened: "2026-07-08",
          date_closed: "2026-08-03",
          tw_v_site: "Cambridge North",
          detailed_description: "Delayed response to a cold-room temperature alarm.",
          conclusion: "Related alarm-response weakness; different equipment failure mode.",
          match_reason: "Shared temperature-control and alarm-response terms.",
        },
      ],
    },
    risk_assessment: {
      case_id: DEMO_CASE_ID,
      status: "ready_for_review",
      investigator_summary:
        "No released product was exposed. Recurrence remains plausible until procedural and valve-verification controls are implemented.",
      event_summary: "47-minute BR-04 temperature excursion during planned utility switchover.",
      severity: "moderate",
      likelihood_of_recurrence: "moderate",
      scientific_rationale:
        "The batch remained on hold and available stability context does not indicate immediate quality impact; however, the control gap applies to comparable equipment.",
      evidence_highlights: ["Peak temperature 9.1°C", "No material transfer", "Checklist verification gap"],
      open_gaps: ["Complete actuator inspection", "Qualified person to approve batch impact conclusion"],
      recommended_next_steps: ["Revise switchover checklist", "Inspect comparable valve actuators"],
      next_steps: ["Revise switchover checklist", "Inspect comparable valve actuators"],
      human_review_checklist: ["Confirm stability assessment", "Approve recurrence rating"],
      source_fact_ids: ["F-001", "F-002", "F-003"],
      review_required: true,
      provisional: true,
    },
    resolution_plan: {
      status: "ready_for_review",
      resolution_records: [
        {
          root_cause_id: "RC-001",
          root_cause_statement:
            "The utility switchover procedure lacked independent valve-feedback verification.",
          status: "ready_for_review",
          correction: {
            id: "COR-001",
            decision: "required",
            justification: "Restore immediate control of the affected system.",
            actions: ["Inspect BR-04 valve actuator", "Verify feedback signal operation"],
            owner: "Facilities Engineering",
            due_date: "2026-10-30",
            status: "ready_for_review",
          },
          corrective_action: {
            id: "CA-001",
            decision: "required",
            justification: "Address the identified procedural root cause.",
            implementation_plan: ["Revise SOP-UTIL-204", "Add independent valve-feedback verification"],
            owner: "Utility Systems",
            due_date: "2026-11-14",
            status: "ready_for_review",
          },
          preventive_action: {
            id: "PA-001",
            decision: "required",
            justification: "Apply the control to comparable vessels.",
            implementation_plan: ["Assess BR-01 through BR-06 switchover controls"],
            owner: "Site Quality",
            due_date: "2026-11-21",
            status: "ready_for_review",
          },
          effectiveness_plan: {
            required: true,
            goal: "Confirm reliable switchover execution and timely alarm response.",
            method: "Review the next five utility switchovers.",
            duration: "90 days",
            owner: "Quality Systems",
            success_criteria: ["100% valve-feedback verification", "No repeat temperature excursions"],
            status: "ready_for_review",
          },
        },
      ],
      review_notes: ["All content requires qualified review before use."],
    },
    capa_draft: {
      case_id: DEMO_CASE_ID,
      status: "ready_for_review",
      summary: "One correction, one corrective action, and one preventive action drafted.",
      ready_for_review: true,
      records: [
        {
          root_cause_id: "RC-001",
          ready_for_review: true,
          alignment_status: "ready_for_review",
          correction_draft: {
            id: "COR-001",
            decision: "required",
            statement: "Inspect BR-04 valve actuator and verify feedback operation.",
            owner: "Facilities Engineering",
            due_date: "2026-10-30",
            status: "ready_for_review",
          },
          corrective_action_draft: {
            id: "CA-001",
            decision: "required",
            statement: "Revise SOP-UTIL-204 to require independent valve-feedback verification.",
            owner: "Utility Systems",
            due_date: "2026-11-14",
            status: "ready_for_review",
          },
          preventive_action_draft: {
            id: "PA-001",
            decision: "required",
            statement: "Assess and align switchover controls for comparable vessels.",
            owner: "Site Quality",
            due_date: "2026-11-21",
            status: "ready_for_review",
          },
          effectiveness_draft: {
            required: true,
            goal: "Verify sustained execution of the revised control.",
            method: "Review five switchovers over 90 days.",
            owner: "Quality Systems",
            success_criteria: ["100% documented valve verification", "No repeat excursion"],
            status: "ready_for_review",
          },
        },
      ],
    },
    capa_level_summary: {
      case_id: DEMO_CASE_ID,
      status: "ready_for_review",
      summary: "Actions span procedure, detection, and mitigation control levels.",
      ready_for_review: true,
      assignments: [
        {
          target_id: "CA-001",
          target_type: "corrective_action_draft",
          assigned_level: "level_4",
          assigned_category: "procedure",
          rationale: "The action changes the required switchover procedure.",
          evidence_refs: ["RC-001", "E-004"],
          confidence: "high",
          status: "ready_for_review",
        },
        {
          target_id: "COR-001",
          target_type: "correction_draft",
          assigned_level: "level_3",
          assigned_category: "detection",
          rationale: "Actuator feedback verification improves failure detection.",
          evidence_refs: ["E-002"],
          confidence: "medium",
          status: "ready_for_review",
        },
      ],
    },
    capa_level_review: {
      case_id: DEMO_CASE_ID,
      status: "ready_for_review",
      overall_pass: true,
      overall_ready: true,
      summary: "The proposed levels align with the synthetic action text.",
      ready_for_review: true,
      record_reviews: [],
      warnings: ["Qualified reviewer approval is required."],
    },
    conclusion: {
      status: "draft",
      summary:
        "The investigation supports a procedural control gap as the primary root cause. No product was released; final impact and CAPA decisions require qualified review.",
      human_review_required: true,
    },
  };
}

const workspaces = new Map<string, WorkspaceCase>([[DEMO_CASE_ID, createDemoWorkspace()]]);
const updatedAt = new Map<string, string>([[DEMO_CASE_ID, now]]);
const drafts = new Map<string, DraftEntry[]>();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function blankWorkspace(caseId: string): WorkspaceCase {
  return {
    case_id: caseId,
    evidence: [],
    facts: { proposed: [], accepted: [], rejected: [] },
  };
}

function getWorkspace(caseId: string) {
  if (!workspaces.has(caseId)) {
    workspaces.set(caseId, blankWorkspace(caseId));
    updatedAt.set(caseId, new Date().toISOString());
  }
  return workspaces.get(caseId)!;
}

function parseBody(init: RequestInit) {
  if (typeof init.body !== "string" || !init.body) return {};
  try {
    return JSON.parse(init.body) as Record<string, any>;
  } catch {
    return {};
  }
}

function createSummary(workspace: WorkspaceCase): CaseSummaryView {
  const sections = [
    [1, "Initial Quality Review", workspace.case_intake],
    [2, "Evidence", workspace.evidence.length ? workspace.evidence : null],
    [3, "Facts", workspace.facts.accepted.length ? workspace.facts : null],
    [4, "Investigation", workspace.investigation],
    [5, "Root Cause Analysis", workspace.rca],
    [6, "Historical Review", workspace.historical_review],
    [7, "Risk Assessment", workspace.risk_assessment],
    [8, "Resolution Planning", workspace.resolution_plan],
    [9, "CAPA Draft", workspace.capa_draft],
    [10, "CAPA Level", workspace.capa_level_summary],
    [11, "Report Generation", workspace.conclusion],
  ] as const;
  return {
    case_id: workspace.case_id,
    overall_status: "Draft — qualified review required",
    attention_stage_id: 7,
    attention_stage_title: "Risk Assessment",
    attention_summary: "Confirm the provisional impact and recurrence ratings.",
    sections: sections.map(([stageId, title, content]) => ({
      key: `stage_${stageId}`,
      title,
      stage_id: stageId,
      edit_stage_id: stageId,
      status: content ? "ready_for_review" : "not_started",
      validation_status: content ? "review_required" : "not_started",
      summary: content ? "Synthetic demo content is available for review." : "No content has been added.",
      missing_fields: [],
      blockers: [],
      warnings: content ? ["Prototype content requires qualified review."] : [],
      recommendations: [],
    })),
    summary_notes: ["Synthetic demo data only. No QMS write-back."],
  };
}

function historicalSearch(): HistoricalReviewSearchPage {
  return {
    records: [
      {
        pr_id: "PR-2026-0097",
        date_opened: "2026-07-08",
        date_closed: "2026-08-03",
        tw_v_initial_criticality: "Minor",
        tw_v_site: "Cambridge North",
        tw_v_responsible_department: "Manufacturing",
        tw_v_dr_type: "Temperature",
        detailed_description: "Delayed response to a cold-room high-temperature alarm.",
        investigation: "Alarm routing and shift response were reviewed.",
        conclusion: "Related non-repeat event; no shared equipment failure.",
        record_type: "Deviation",
        search_type: "keyword",
        match_reason: "Temperature and alarm-response terms matched.",
      },
      {
        pr_id: "PR-2025-0314",
        date_opened: "2025-11-12",
        date_closed: "2025-12-04",
        tw_v_initial_criticality: "Minor",
        tw_v_site: "Cambridge North",
        tw_v_responsible_department: "Facilities",
        tw_v_dr_type: "Utility",
        detailed_description: "Chilled-water pressure fluctuation during preventive maintenance.",
        investigation: "Utility trend and maintenance sequence reviewed.",
        conclusion: "Not related; pressure fluctuation had a distinct mechanical cause.",
        record_type: "Deviation",
        search_type: "semantic",
        match_reason: "Shared chilled-water utility context.",
      },
    ],
    page: 1,
    page_size: 20,
    total: 2,
    total_pages: 1,
  };
}

function applyAction(workspace: WorkspaceCase, action: string, payload: Record<string, any>) {
  if (action === "set_case_intake") {
    workspace.case_intake = {
      pr_id: payload.pr_id || workspace.case_id,
      rapid_status: payload.rapid_status,
      metadata: payload.metadata,
      detailed_description: payload.detailed_description,
      immediate_action_taken: payload.immediate_action_taken,
      trackwise_record: payload.record,
    };
    if (!workspace.evidence.some((item) => item.source_type === "case_intake")) {
      workspace.evidence.unshift({
        evidence_id: "E-INTAKE",
        evidence_title: "Case Intake",
        source_type: "case_intake",
        category: "Case Intake",
        status: "ready",
        source_data: payload.detailed_description,
      });
    }
  } else if (action === "upload_evidence") {
    const items = Array.isArray(payload.evidence_items) ? payload.evidence_items : [];
    workspace.evidence.push(...items.map((item: any, index: number) => ({
      ...item,
      evidence_id: `E-${String(workspace.evidence.length + index + 1).padStart(3, "0")}`,
      source_type: item.source_type || "uploaded_evidence",
      status: item.status || "ready",
    })));
  } else if (action === "extract_facts" && workspace.facts.proposed.length === 0) {
    workspace.facts.proposed = clone(acceptedFacts).map((fact) => ({ ...fact, status: "pending" }));
  } else if (action === "accept_facts" || action === "reject_facts") {
    const ids = new Set(payload.fact_ids || []);
    const target = action === "accept_facts" ? workspace.facts.accepted : workspace.facts.rejected;
    const status = action === "accept_facts" ? "accepted" : "rejected";
    const all = [...workspace.facts.proposed, ...workspace.facts.accepted, ...workspace.facts.rejected];
    const selected = all.filter((fact) => ids.has(fact.fact_id)).map((fact) => ({ ...fact, status })) as WorkspaceFact[];
    workspace.facts.proposed = all.filter((fact) => !ids.has(fact.fact_id) && fact.status === "pending");
    workspace.facts.accepted = all.filter((fact) => !ids.has(fact.fact_id) && fact.status === "accepted");
    workspace.facts.rejected = all.filter((fact) => !ids.has(fact.fact_id) && fact.status === "rejected");
    target.push(...selected);
  } else {
    const updateMap: Record<string, keyof WorkspaceCase> = {
      update_historical_review: "historical_review",
      update_risk_assessment: "risk_assessment",
      update_resolution_plan: "resolution_plan",
      update_capa_draft: "capa_draft",
      update_capa_level_summary: "capa_level_summary",
      update_capa_level_review: "capa_level_review",
    };
    const field = updateMap[action];
    if (field) {
      (workspace as any)[field] = payload[field];
    }
  }
  updatedAt.set(workspace.case_id, new Date().toISOString());
  return workspace;
}

export async function mockRequestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  await Promise.resolve();
  const url = new URL(path, "https://author.demo.local");
  const pathname = url.pathname;
  const method = (init.method || "GET").toUpperCase();
  const body = parseBody(init);

  if (pathname === "/trackwise/search") {
    const query = (url.searchParams.get("query") || "").toLowerCase();
    const mode = url.searchParams.get("mode");
    const includeClosed = url.searchParams.get("include_closed") === "true";
    const records = trackWiseRecords.filter((record) => {
      const matches = !query || (mode === "assigned_to" ? record.assigned_to : record.pr_id).toLowerCase().includes(query);
      return matches && (includeClosed || record.current_state !== "Closed");
    });
    return clone({ records }) as T;
  }

  if (pathname === "/cases") {
    const cases: SavedCaseSummary[] = [...workspaces.values()].map((workspace) => ({
      case_id: workspace.case_id,
      updated_at: updatedAt.get(workspace.case_id) || now,
      evidence_count: workspace.evidence.length,
    }));
    return clone({ cases }) as T;
  }

  if (pathname === "/historical-review/filter-options") {
    return clone({
      sites: ["Cambridge North", "Rockville"],
      criticalities: ["Minor", "Major", "Critical"],
      departments: ["Manufacturing", "Facilities", "Quality"],
    }) as T;
  }

  if (pathname === "/historical-review/search") {
    return clone(historicalSearch()) as T;
  }

  const caseMatch = pathname.match(/^\/case\/([^/]+)(.*)$/);
  if (caseMatch) {
    const caseId = decodeURIComponent(caseMatch[1]);
    const suffix = caseMatch[2];
    const workspace = getWorkspace(caseId);

    if (!suffix && method === "DELETE") {
      workspaces.delete(caseId);
      updatedAt.delete(caseId);
      return { deleted: true, case_id: caseId } as T;
    }
    if (!suffix && method === "GET") return clone(workspace) as T;
    if (suffix === "/summary") return clone(createSummary(workspace)) as T;
    if (suffix === "/rename") {
      const nextId = String(body.case_id || caseId);
      workspaces.delete(caseId);
      updatedAt.delete(caseId);
      workspace.case_id = nextId;
      workspaces.set(nextId, workspace);
      updatedAt.set(nextId, new Date().toISOString());
      return clone(workspace) as T;
    }
    if (suffix === "/action") {
      if (body.action === "review_export") {
        return clone({
          case_id: caseId,
          review_gate: "export",
          context: {},
          report: {
            case_id: caseId,
            review_gate: "export",
            overall_status: "review_required",
            overall_score: 88,
            section_scores: { evidence: 92, traceability: 86, completeness: 85 },
            findings: [],
            warnings: [{ code: "SYNTHETIC_DATA", message: "Synthetic prototype content requires qualified review." }],
            blocking_issues: [],
            recommendations: ["Confirm the provisional risk assessment before regulated use."],
            reviewer_results: [],
          },
          report_canonical: "Synthetic demo review",
        }) as T;
      }
      return clone(applyAction(workspace, body.action, body.payload || {})) as T;
    }
    if (suffix === "/historical-review/search-criteria/generate") {
      const search_criteria_draft = {
        objective: "Identify related temperature-control, utility-switchover, and alarm-response deviations.",
        event_summary: "BR-04 temperature excursion during planned chilled-water switchover.",
        recommended_systems: ["Synthetic TrackWise dataset"],
        timeframe: { start: "2024-10-18", end: "2026-10-18", rationale: "Two-year lookback." },
        search_terms: { required: ["temperature", "chilled water"], optional: ["alarm", "valve", "switchover"], exclude: [] },
        scope: { site: "Cambridge North", equipment: "BR-04", process: "Harvest hold" },
        rationale: "Criteria cover the event mechanism and response controls.",
        limitations: ["Synthetic records only."],
        confidence: "medium" as const,
        review_required: true,
        source_fact_ids: ["F-001", "F-002"],
      };
      workspace.historical_review = { ...(workspace.historical_review || {}), search_criteria_draft };
      return clone({ search_criteria_draft }) as T;
    }
    if (suffix === "/historical-review/record-evaluations/evaluate") {
      return clone({
        case_id: caseId,
        evaluations: [{
          record_id: "PR-2026-0097",
          classification: "related_non_repeat",
          rationale: "Related alarm-response weakness with a different equipment failure mode.",
          evidence_used: ["PR-2026-0097"],
          confidence: "medium",
          review_required: true,
        }],
      }) as T;
    }
    if (suffix === "/risk-assessment/generate") {
      const risk_assessment = createDemoWorkspace().risk_assessment;
      workspace.risk_assessment = risk_assessment;
      return clone({ risk_assessment }) as T;
    }
    if (suffix === "/drafts") {
      const entries = drafts.get(caseId) || [];
      if (method === "GET") return clone(entries) as T;
      const entry: DraftEntry = {
        draft_id: `draft-${Date.now()}`,
        case_id: caseId,
        section_key: body.section_key || "investigation",
        title: body.title || "Investigation Draft",
        content: body.content || "",
        status: body.status || "draft",
        version: entries.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: body.created_by || "Demo User",
        source_facts: body.source_facts || [],
        source_evidence_ids: body.source_evidence_ids || [],
        last_edited_by: body.last_edited_by || "Demo User",
        metadata: body.metadata || {},
        storage_backend: "in-memory-demo",
      };
      entries.push(entry);
      drafts.set(caseId, entries);
      return clone(entry) as T;
    }
  }

  const draftMatch = pathname.match(/^\/drafts\/([^/]+)$/);
  if (draftMatch) {
    const draftId = decodeURIComponent(draftMatch[1]);
    const entry = [...drafts.values()].flat().find((item) => item.draft_id === draftId);
    if (!entry) throw new Error("Demo draft not found.");
    if (method === "PUT") Object.assign(entry, body, { updated_at: new Date().toISOString() });
    return clone(entry) as T;
  }

  throw new Error(`Demo service does not support ${method} ${pathname}.`);
}
