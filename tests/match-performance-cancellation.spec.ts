import {test,expect} from "@playwright/test"
import {index,details} from "./fixtures/match-dataset"
import {filterResponse} from "./fixtures/match-explorer"
import {initialMatches,reviewedMatches,verifiedOverview} from "./fixtures/match-performance"
test('a new search cancels an old review and clears its selected source',async({page})=>{
  let release!:()=>void,finished!:()=>void,oldBody:any
  const gate=new Promise<void>(resolve=>{release=resolve}),completed=new Promise<void>(resolve=>{finished=resolve})
  const first='What actions addressed calibration failures?',second='What actions addressed packaging discrepancies?'
  await page.route('**/api/v1/match/index',r=>r.fulfill({json:{...index,progressive_search:true}}))
  await page.route('**/api/v1/match/facets',r=>r.fulfill({json:filterResponse(r.request().postDataJSON())}))
  await page.route('**/api/v1/match/cases',r=>r.fulfill({json:{items:[]}}))
  await page.route('**/api/v1/match/matched-records/*?*',r=>r.fulfill({json:details[0]}))
  await page.route('**/api/v1/match/search',r=>{
    const body=r.request().postDataJSON()
    if(body.query===first){oldBody=body;return r.fulfill({json:initialMatches(body)})}
    return r.fulfill({json:{...reviewedMatches(body),cache_hit:true,summary_id:'d'.repeat(32),search_id:'d'.repeat(32)}})
  })
  await page.route('**/api/v1/match/review',async r=>{await gate;await r.fulfill({json:reviewedMatches(oldBody)}).catch(()=>{});finished()})
  await page.route('**/api/v1/match/overview',r=>r.fulfill({json:verifiedOverview(r.request().postDataJSON().search_id)}))
  await page.goto('/match');await expect(page.getByText(/3 searchable deviations/).first()).toBeVisible()
  const input=page.getByRole('textbox',{name:'Search history',exact:true})
  await input.fill(first);await page.getByRole('button',{name:'Search',exact:true}).click()
  const results=page.getByRole('region',{name:'Search results',exact:true}),selected=page.getByRole('complementary',{name:'Selected deviation',exact:true})
  await expect(page.getByText('Initial matches · reviewing relevance…',{exact:true})).toBeVisible()
  await results.locator('button[aria-pressed]').first().click();await expect(selected).toContainText(details[0].pr_id)
  await input.fill(second);await page.getByRole('button',{name:'Search',exact:true}).click()
  await expect(results).toContainText(`Results for: ${second}`);await expect(selected).not.toContainText(details[0].pr_id)
  release();await completed
  await expect(results).toContainText(`Results for: ${second}`);await expect(results).not.toContainText(`Results for: ${first}`)
  await expect(page.getByRole('region',{name:'Evidence overview',exact:true})).toContainText('Cited answer')
})
