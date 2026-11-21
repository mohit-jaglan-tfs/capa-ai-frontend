import {test,expect,type Page} from "@playwright/test"
import {index,details} from "./fixtures/match-dataset"
import {filterResponse} from "./fixtures/match-explorer"
import {initialMatches,reviewedMatches,failedOverview,verifiedOverview,summaryId} from "./fixtures/match-performance"
const results=(page:Page)=>page.getByRole('region',{name:'Search results',exact:true})
const selected=(page:Page)=>page.getByRole('complementary',{name:'Selected deviation',exact:true})
test.beforeEach(async({page})=>{
  await page.route('**/api/v1/match/index',r=>r.fulfill({json:{...index,progressive_search:true}}))
  await page.route('**/api/v1/match/facets',r=>r.fulfill({json:filterResponse(r.request().postDataJSON())}))
  await page.route('**/api/v1/match/cases',r=>r.fulfill({json:{items:[]}}))
  await page.route('**/api/v1/match/matched-records/*?*',r=>r.fulfill({json:details[0]}))
})
async function start(page:Page,query='What actions addressed calibration failures?'){
  await page.goto('/match');await page.getByRole('textbox',{name:'Search history',exact:true}).fill(query)
  await page.getByRole('button',{name:'Search',exact:true}).click();await expect(results(page)).toBeVisible()
}

test('source records are usable during relevance review; verified overview waits for the final set',async({page})=>{
  let release!:()=>void,body:any,overviewCalls=0
  const gate=new Promise<void>(resolve=>{release=resolve})
  await page.route('**/api/v1/match/search',r=>{body=r.request().postDataJSON();expect(body.progressive).toBe(true);return r.fulfill({json:initialMatches(body)})})
  await page.route('**/api/v1/match/review',async r=>{await gate;await r.fulfill({json:reviewedMatches(body)})})
  await page.route('**/api/v1/match/overview',r=>{overviewCalls++;return r.fulfill({json:verifiedOverview(r.request().postDataJSON().search_id)})})
  await start(page);await expect(page.getByText('Initial matches · reviewing relevance…',{exact:true})).toBeVisible()
  expect(overviewCalls).toBe(0)
  await results(page).locator('button[aria-pressed]').first().click();await expect(selected(page)).toContainText(details[0].pr_id)
  release();await expect(page.getByRole('region',{name:'Evidence overview',exact:true})).toContainText('Cited answer')
  await expect(page.getByText('Initial matches · reviewing relevance…',{exact:true})).toHaveCount(0)
  await expect(selected(page)).toContainText(details[0].pr_id);expect(overviewCalls).toBe(1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

for(const empty of [false,true])test(`an opened initial record remains readable when final review ${empty?'returns no matches':'removes it'}`,async({page})=>{
  let release!:()=>void,body:any
  const gate=new Promise<void>(resolve=>{release=resolve})
  await page.route('**/api/v1/match/search',r=>{body=r.request().postDataJSON();return r.fulfill({json:initialMatches(body)})})
  await page.route('**/api/v1/match/review',async r=>{await gate;const final=reviewedMatches(body);final.results=empty?[]:final.results.slice(1);final.result_count=final.results.length;await r.fulfill({json:{...final,summary_id:empty?null:summaryId}})})
  await page.route('**/api/v1/match/overview',r=>{const ids=reviewedMatches(body).results.slice(1).map(row=>row.pr_id);return r.fulfill({json:failedOverview(summaryId,ids,ids.length)})})
  await start(page);await results(page).locator('button[aria-pressed]').first().click();await expect(selected(page)).toContainText(details[0].pr_id)
  release();await expect(page.getByText(/was opened from initial matches/)).toBeVisible();await expect(selected(page)).toContainText(details[0].pr_id)
})

test('a relevance network failure keeps honest initial candidates and does not start an overview',async({page})=>{
  let overviewCalls=0
  await page.route('**/api/v1/match/search',r=>r.fulfill({json:initialMatches(r.request().postDataJSON())}))
  await page.route('**/api/v1/match/review',r=>r.fulfill({status:503,json:{detail:'Fictional unavailable review'}}))
  await page.route('**/api/v1/match/overview',r=>{overviewCalls++;return r.fulfill({json:{}})})
  await start(page);await expect(page.getByRole('alert')).toContainText('Initial matches are available')
  await expect(results(page)).toBeVisible();expect(overviewCalls).toBe(0)
})

test('a complete cached search goes directly to its source-verified overview',async({page})=>{
  let reviews=0
  await page.route('**/api/v1/match/search',r=>r.fulfill({json:{...reviewedMatches(r.request().postDataJSON()),cache_hit:true}}))
  await page.route('**/api/v1/match/review',r=>{reviews++;return r.fulfill({json:{}})})
  await page.route('**/api/v1/match/overview',r=>r.fulfill({json:verifiedOverview(r.request().postDataJSON().search_id)}))
  await start(page);await expect(page.getByRole('region',{name:'Evidence overview',exact:true})).toContainText('Cited answer');expect(reviews).toBe(0)
})
