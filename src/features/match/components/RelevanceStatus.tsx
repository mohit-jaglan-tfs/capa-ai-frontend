import type {SearchResult} from "../types"
export function RelevanceStatus({result,error}:{result:SearchResult;error:string}) {
  if(result.reviewState==="pending")return <div role="status" aria-live="polite" className="rounded-lg border border-suite-line bg-suite-info-wash p-3 text-xs leading-5 text-suite-blue"><strong>Initial matches · reviewing relevance…</strong><p>You can open the source records now. The matches may update when the review finishes; the evidence overview will follow.</p></div>
  if(error)return <p role="alert" className="rounded-lg border border-suite-line bg-warn-wash p-3 text-xs leading-5 text-warn-ink">{error}</p>
  if(result.reviewState==="unavailable")return <p role="status" className="rounded-lg border border-suite-line bg-warn-wash p-3 text-xs leading-5 text-warn-ink">Local matches are available. AI relevance review could not be completed; inspect the source evidence.</p>
  return null
}
