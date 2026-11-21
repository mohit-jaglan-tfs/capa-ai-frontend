import {ApiError} from "@/shared/api/httpClient"
import {matchApi} from "@/shared/api/clients"
import type {SearchResult} from "../types"

export class ProgressiveReviewError extends Error {
  constructor(public readonly initial:SearchResult) {
    super("Initial matches are available, but relevance review could not be completed. Search again to retry.")
    this.name="ProgressiveReviewError"
  }
}

export function applyReviewMetadata(value:Record<string,unknown>,result:SearchResult) {
  if(value.review_state!==undefined&&typeof value.review_state!=="string")throw new Error("Invalid relevance-review state.")
  if(value.review_id!=null&&(typeof value.review_id!=="string"||!/^[a-f0-9]{32}$/.test(value.review_id)))throw new Error("Invalid relevance-review reference.")
  if(value.cache_hit!==undefined&&typeof value.cache_hit!=="boolean")throw new Error("Invalid cached-result state.")
  result.reviewState=value.review_state as string|undefined
  result.reviewId=value.review_id as string|undefined
  result.cacheHit=value.cache_hit as boolean|undefined
  if(result.reviewState==="pending"&&(!result.reviewId||result.summaryId||!result.rows.length||result.rows.some(row=>row.relationship)))throw new Error("Initial matches cannot claim completed AI review or a verified overview.")
  if(result.reviewId&&["reviewed","ai_reviewed"].includes(result.reviewState??"")&&result.rows.some(row=>!row.relationship))throw new Error("The relevance review is missing its candidate assessments.")
}

export async function completeReview(initial:SearchResult,signal:AbortSignal|undefined,onInitial:((value:SearchResult)=>void)|undefined,validate:(value:unknown)=>SearchResult):Promise<SearchResult> {
  if(initial.reviewState!=="pending")return initial
  if(!onInitial||!initial.reviewId)throw new Error("An unexpected incomplete search was returned.")
  if(signal?.aborted)throw new DOMException("The search was cancelled.","AbortError")
  onInitial(initial)
  try {
    const raw=await matchApi.requestJson<unknown>("/api/v1/match/review",{method:"POST",body:JSON.stringify({review_id:initial.reviewId}),signal})
    const result=validate(raw)
    if(result.reviewId!==initial.reviewId||!["reviewed","ai_reviewed","unavailable","local_ranking"].includes(result.reviewState??"")||
      (result.snapshotId??result.rows[0]?.snapshotId)!==(initial.snapshotId??initial.rows[0]?.snapshotId)||
      result.scope!==initial.scope||JSON.stringify(result.filters)!==JSON.stringify(initial.filters)||
      JSON.stringify(result.requiredIdentifiers)!==JSON.stringify(initial.requiredIdentifiers))throw new Error("Relevance review belongs to another search or source.")
    return result
  }catch(error){
    if(signal?.aborted||error instanceof ApiError&&[403,404].includes(error.status))throw error
    throw new ProgressiveReviewError(initial)
  }
}
