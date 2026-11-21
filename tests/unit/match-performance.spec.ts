import {test,expect} from "@playwright/test"
import {matchApi} from "../../src/shared/api/clients"
import {matchService} from "../../src/features/match/services/matchService"
import {parseSearchResponse} from "../../src/features/match/services/parse"
import {ProgressiveReviewError} from "../../src/features/match/services/progressive"
import {initialMatches,reviewedMatches} from "../fixtures/match-performance"
const original=matchApi.requestJson
const body={query:"What actions addressed calibration failures?",all_sites:true,mode:"auto",assist:true,top_k:10}
const input=()=>parseSearchResponse(reviewedMatches(body)).submittedCriteria!
test.afterEach(()=>{matchApi.requestJson=original})

test("initial source candidates are delivered before the relevance request completes",async()=>{
  let release!:(v:unknown)=>void,shown=false
  const gate=new Promise(resolve=>{release=resolve})
  matchApi.requestJson=(async(path:string,options:any)=>path.endsWith('/review')?await gate:initialMatches(JSON.parse(options.body))) as typeof original
  const pending=matchService.search(input(),undefined,initial=>{shown=true;expect(initial.summaryId).toBeNull();expect(initial.reviewState).toBe('pending')})
  await expect.poll(()=>shown).toBe(true)
  release(reviewedMatches(body));expect((await pending).reviewState).toBe('ai_reviewed')
})

test("a cached complete result skips relevance review and the initial-result callback",async()=>{
  let calls=0,initials=0
  matchApi.requestJson=(async()=>{calls++;return {...reviewedMatches(body),cache_hit:true}}) as typeof original
  expect((await matchService.search(input(),undefined,()=>{initials++})).cacheHit).toBe(true)
  expect(calls).toBe(1);expect(initials).toBe(0)
})

test("pending candidates cannot claim a verified overview or completed AI relationships",()=>{
  const initial=initialMatches(body)
  expect(()=>parseSearchResponse({...initial,summary_id:'f'.repeat(32)})).toThrow()
  expect(()=>parseSearchResponse({...initial,review_id:null})).toThrow()
  expect(()=>parseSearchResponse({...initial,results:reviewedMatches(body).results})).toThrow()
})

test("a review from another source or job cannot replace the initial candidates",async()=>{
  for(const changes of [{source_snapshot_id:'f'.repeat(64)},{review_id:'e'.repeat(32)}]){
    matchApi.requestJson=(async(path:string)=>path.endsWith('/review')?{...reviewedMatches(body),...changes}:initialMatches(body)) as typeof original
    await expect(matchService.search(input(),undefined,()=>{})).rejects.toBeInstanceOf(ProgressiveReviewError)
  }
})

test("search cancellation aborts the in-flight review",async()=>{
  let shown=false;const controller=new AbortController()
  matchApi.requestJson=(async(path:string,options:any)=>{
    if(!path.endsWith('/review'))return initialMatches(body)
    return await new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true}))
  }) as typeof original
  const pending=matchService.search(input(),controller.signal,()=>{shown=true})
  await expect.poll(()=>shown).toBe(true);controller.abort()
  await expect(pending).rejects.toMatchObject({name:'AbortError'})
})
