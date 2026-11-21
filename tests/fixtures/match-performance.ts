import {assisted} from "./match-assist"
import {verifiedOverview,unavailableOverview} from "./match-overview-recovery"
export const reviewId="b".repeat(32),summaryId="c".repeat(32)
export function initialMatches(body:any){return {...assisted(body),review_id:reviewId,review_state:"pending",summary_id:null,search_id:null,cache_hit:false}}
export function reviewedMatches(body:any){
  const base=assisted(body,summaryId)
  return {...base,review_id:reviewId,review_state:"ai_reviewed",search_id:summaryId,cache_hit:false,results:base.results.map(row=>({...row,candidate_relationship:"direct"}))}
}
export function failedOverview(id:string,ids:string[],count:number){
  const base=unavailableOverview(id)
  return {...base,reviewed_ids:ids,returned_count:count,lines:base.lines.map(line=>({...line,references:ids}))}
}
export {verifiedOverview}
