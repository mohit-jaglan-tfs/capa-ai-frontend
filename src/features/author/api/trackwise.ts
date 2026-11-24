import { requestJson } from "./client";

export type TrackWiseSearchMode = "pr_id" | "assigned_to";

export interface TrackWiseRecord {
  pr_id: string;
  assigned_to: string;
  short_description: string;
  tw_v_detailed_description?: string;
  tw_v_immediate_action_taken?: string;
  detailed_description?: string;
  immediate_action_taken?: string;
  rapid_status?: "required" | "not_required" | "already_completed";
  site?: string;
  current_state?: string;
  date_opened?: string;
  date_due?: string;
  days_remaining?: number;
}

export function searchTrackwiseRecords(
  query: string,
  mode: TrackWiseSearchMode = "pr_id",
  includeClosed = false,
) {
  const params = new URLSearchParams({
    query,
    mode,
    include_closed: String(includeClosed),
  });

  return requestJson<{ records: TrackWiseRecord[] }>(`/trackwise/search?${params.toString()}`);
}
