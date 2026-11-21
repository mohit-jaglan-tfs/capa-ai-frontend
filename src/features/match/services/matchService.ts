import {completeReview} from "./progressive"
import { ApiError } from "@/shared/api/httpClient"
import {rowMatchesScope} from "../scopeModel"
import { matchApi } from "@/shared/api/clients"
import type { EvidenceOverview, FilterOptions, IndexInfo, MatchFilters, MatchRow, RecordDetail, SearchInput, SearchResult } from "../types"
import { parseEvidenceOverview, parseFilterOptions, parseIndexInfo, parseRecordDetail, parseSearchResponse } from "./parse"
import { canonicalFilters, filterKey, hasFilters, inputKey } from "../searchModel"

const BASE = "/api/v1/match"
export const matchService = {
  async search(input: SearchInput, signal?: AbortSignal, onInitial?: (result:SearchResult)=>void): Promise<SearchResult> {
    const { query, site, topK, mode, offset } = input
    const validate=(result:SearchResult):SearchResult=>{
    const submitted = result.submittedCriteria
    const effective = result.filters
    const changedSelectedFilters = effective && Object.entries(canonicalFilters(input.filters)).some(([key, value]) => {
      const implicitCompleted = key === "record_scope" && value === "completed" && !hasFilters(input.filters)
      const selected = !implicitCompleted && (Array.isArray(value) ? value.length > 0 : value !== null && value !== "any")
      return selected && JSON.stringify(value) !== JSON.stringify(canonicalFilters(effective)[key as keyof MatchFilters])
    })
    const wrongCriteria = submitted ? inputKey(submitted) !== inputKey(input) || submitted.offset !== offset :
      result.scope !== (site || "All allowed sites") || (result.filters ? filterKey(result.filters) !== filterKey(input.filters) : hasFilters(input.filters))
    if (result.query !== query || wrongCriteria || changedSelectedFilters || result.filters && result.rows.some(row=>!rowMatchesScope(row,result.filters!)) || site && result.scope !== site || result.rows.length > topK || result.offset !== offset || result.requestedMode !== mode)
      throw new Error("MATCH returned results for a different query or scope. Please retry.")
    return result
    }
    const result = parseSearchResponse(await matchApi.requestJson<unknown>(`${BASE}/search`, {
      method: "POST",
      body: JSON.stringify({ query, ...(site ? { site } : { all_sites: true }), top_k: topK,
        ...(hasFilters(input.filters) ? { filters: canonicalFilters(input.filters) } : {}),
        mode, assist: true, ...(onInitial ? {progressive:true} : {}), ...(offset ? { offset } : {}) }),
      signal,
    }))
    return completeReview(validate(result), signal, onInitial, raw=>validate(parseSearchResponse(raw)))
  },
  async getOverview(result: SearchResult, signal?: AbortSignal): Promise<EvidenceOverview> {
    for (let attempt=0;attempt<2;attempt++) {
      if(signal?.aborted)throw new DOMException("The overview was cancelled.","AbortError")
      try {
        return parseEvidenceOverview(await matchApi.requestJson<unknown>(`${BASE}/overview`, {
          method: "POST", body: JSON.stringify({ search_id: result.summaryId }), signal,
        }), result)
      } catch(error) {
        if(signal?.aborted||attempt||!(error instanceof ApiError)||![0,408,429,500,502,503,504].includes(error.status))throw error
        await new Promise<void>((resolve,reject)=>{
          const abort=()=>{clearTimeout(timer);reject(new DOMException("The overview was cancelled.","AbortError"))}
          const timer=setTimeout(()=>{signal?.removeEventListener("abort",abort);resolve()},200)
          signal?.addEventListener("abort",abort,{once:true})
          if(signal?.aborted)abort()
        })
      }
    }
    throw new Error("The overview is unavailable.")
  },
  async getFilterOptions(site: string, filters: MatchFilters, signal?: AbortSignal): Promise<FilterOptions> {
    const value = parseFilterOptions(await matchApi.requestJson<unknown>(`${BASE}/facets`, {
      method: "POST", body: JSON.stringify({ ...(site ? { site } : { all_sites: true }), filters: canonicalFilters(filters) }), signal,
    }))
    if (value.scope !== (site || "All allowed sites") || filterKey(value.filters) !== filterKey(filters)) throw new Error("Filter options belong to another scope. Please retry.")
    return value
  },
  async getRecord(row: MatchRow, signal?: AbortSignal): Promise<RecordDetail> {
    const query = new URLSearchParams({ site: row.site })
    return parseRecordDetail(await matchApi.requestJson<unknown>(
      `${BASE}/matched-records/${encodeURIComponent(row.deviationId)}?${query}`, { signal },
    ), row)
  },
  async getIndexInfo(signal?: AbortSignal): Promise<IndexInfo> {
    return parseIndexInfo(await matchApi.requestJson<unknown>(`${BASE}/index`, { signal }))
  },
}
