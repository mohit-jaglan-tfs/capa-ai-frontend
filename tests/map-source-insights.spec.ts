import {test,expect,type Page} from "@playwright/test"
import fs from "node:fs"
const fixture=JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json",import.meta.url),"utf8"))
function dataset() {
  const data=structuredClone(fixture),original=data.records[0]
  data.records=[
    {...original,id:"D-MINOR",criticality:"Minor",dueDate:"2026-01-10",closedDate:"2026-01-10",dueStatus:"closed_on_time"},
    {...original,id:"D-MAJOR",criticality:"Major",dueDate:"2026-01-10",closedDate:"2026-01-09",dueStatus:"closed_on_time"},
    {...original,id:"D-CRITICAL",criticality:"Critical",dueDate:"2026-01-10",closedDate:"2026-01-09",dueStatus:"closed_on_time"},
    {...original,id:"D-LATE",criticality:"Minor",dueDate:"2026-01-10",closedDate:"2026-01-11",dueStatus:"closed_late"},
  ]
  data.analysis.recordCount=4;data.analysis.sourceAvailable=true;data.capas=[]
  data.clusters=data.clusters.filter((c:any)=>c.id===original.clusterId)
  for(const c of data.clusters){c.capas=[];if(c.analysisContext)c.analysisContext.recordCount=4}
  return data
}
function ranking(labels:string[],counts:number[],fields=["client"]) {
  const topCount=counts.reduce((a,b)=>a+b,0)
  return {rows:labels.map((label,i)=>({label,count:counts[i],percent:counts[i]/8*100})),knownCount:topCount,missingCount:8-topCount,distinctCount:labels.length,topCount,topShare:topCount/8*100,cutoffTied:false,fields,recordedCount:topCount,mappedCount:0,basis:"Recorded source field",unavailableReason:""}
}
function source(data:any,asOf:string) {
  return {runId:data.analysis.runId,scope:"source_snapshot",available:true,snapshotId:data.analysis.resolvedSnapshotId??data.analysis.snapshotId,asOf,dateFrom:`${Number(asOf.slice(0,4))-1}${asOf.slice(4)}`,dateTo:asOf,sourceRecordCount:15,deviationCount:10,windowDeviationCount:8,undatedCount:0,futureDatedCount:0,latestOpened:asOf,clients:ranking(["Fictional Client A","Fictional Client B","Fictional Client C"],[3,2,1]),stages:ranking(["Packaging","Manufacturing","QC"],[4,2,1],["stage"]),products:ranking(["Fictional Product P","Fictional Product Q","Fictional Product R"],[2,1,1],["product_name"])}
}
async function mock(page:Page,unavailable=false) {
  const data=dataset()
  await page.route("**/map/dataset",route=>route.fulfill({json:data}))
  await page.route("**/api/v1/map/runs?*",route=>route.fulfill({json:{items:[]}}))
  await page.route("**/api/v1/map/runs/*/dataset",route=>route.fulfill({json:data}))
  await page.route("**/api/v1/map/runs/*/insights?*",route=>{
    const value=source(data,new URL(route.request().url()).searchParams.get("as_of")!)
    if(unavailable) for(const key of ["clients","products"] as const)value[key]={...ranking([],[],key==="clients"?["client"]:[]),unavailableReason:key==="clients"?"All recorded client values are blank or unavailable in this period.":"No structured product field is available in this source."}
    return route.fulfill({json:value})
  })
  return data
}
async function more(page:Page){await page.getByText(/^More filters \(/).click()}

test("all insights precede guided investigation, and DR types precede cumulative share",async({page})=>{
  await mock(page);await page.goto("/map")
  const insights=page.getByRole("region",{name:"Deviation insights",exact:true})
  await expect(insights.getByRole("list",{name:"Top three stages",exact:true})).toContainText("Packaging")
  await expect(insights.getByText("Top stages · past 12 months",{exact:true})).toBeVisible()
  for(const name of ["Top 3 clients","Top 3 products"])await expect(insights.getByText(name,{exact:true})).toHaveCount(0)
  await expect(insights.getByRole("region",{name:"Analysis KPIs",exact:true}).locator(".map-kpi-card")).toHaveCount(5)
  const top=(await insights.boundingBox())!,guide=(await page.getByText("Guided investigation",{exact:true}).boundingBox())!
  expect(guide.y).toBeGreaterThanOrEqual(top.y+top.height)
  const rows=page.getByRole("list",{name:"Top three DR types",exact:true}),combined=page.getByLabel("DR types combined contribution",{exact:true})
  expect((await combined.boundingBox())!.y).toBeGreaterThan((await rows.boundingBox())!.y+(await rows.boundingBox())!.height)
})

test("CAPA and due-date filters start in More filters and source rankings retain their full-source scope",async({page})=>{
  await mock(page);await page.goto("/map")
  for(const name of ["CAPA linkage","CAPA status","Due-date status"])await expect(page.getByRole("combobox",{name,exact:true})).toHaveCount(0)
  await more(page)
  await expect(page.getByRole("combobox",{name:"CAPA linkage",exact:true})).toBeVisible()
  await page.getByRole("combobox",{name:"Due-date status",exact:true}).selectOption("Closed on time")
  await expect(page.getByRole("region",{name:"Analysis KPIs",exact:true})).toContainText("Out of 3 deviations")
  await expect(page.getByLabel("On-time closure by criticality",{exact:true})).toContainText("100.0%")
  await expect(page.getByRole("region",{name:"Past 12 months source rankings",exact:true})).toContainText("8 deviations in period")
  await page.reload()
  await expect(page.getByRole("combobox",{name:"Due-date status",exact:true})).toHaveValue("Closed on time")
  await page.getByRole("button",{name:"Clear all",exact:true}).click()
  await expect(page.getByRole("region",{name:"Analysis KPIs",exact:true})).toContainText("Out of 4 deviations")
})

test("100 percent fits its own column at narrow desktop widths, phone widths and zoom",async({page})=>{
  await mock(page);await page.goto("/map")
  await more(page);await page.getByRole("combobox",{name:"Due-date status",exact:true}).selectOption("Closed on time")
  const values=page.locator(".map-closure-value")
  await expect(values).toHaveCount(3);await expect(values.first()).toHaveText("100.0%")
  await page.evaluate(()=>document.fonts.ready)
  for(const width of [320,390,820,1024,1180,1280,1440,1680]) {
    await page.setViewportSize({width,height:1000})
    // The app supports a minimum 320 CSS-pixel viewport. Exercise zoom on
    // tablet/desktop widths without reducing the phone below that boundary.
    for(const zoom of width>=820?["100%","125%"]:["100%"]){
      await page.evaluate(value=>document.body.style.zoom=value,zoom)
      const cells=await values.evaluateAll(elements=>elements.map(element=>{
        const range=document.createRange();range.selectNodeContents(element)
        const text=range.getBoundingClientRect(),cell=element.getBoundingClientRect()
        return {fits:element.scrollWidth<=element.clientWidth+1&&text.right<=cell.right+1,visible:cell.width>0,readable:parseFloat(getComputedStyle(element).fontSize)>=16}
      }))
      expect(cells,`width ${width}, zoom ${zoom}`).toEqual([{fits:true,visible:true,readable:true},{fits:true,visible:true,readable:true},{fits:true,visible:true,readable:true}])
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`width ${width}, zoom ${zoom}`).toBe(true)
    }
  }
})

test("missing client and product cards are omitted while the stage ranking remains in the KPI layout",async({page})=>{
  await mock(page,true);await page.goto("/map")
  const source=page.getByRole("region",{name:"Past 12 months source rankings",exact:true})
  await expect(page.getByText("Top 3 clients",{exact:true})).toHaveCount(0)
  await expect(page.getByText("Top 3 products",{exact:true})).toHaveCount(0)
  await expect(source.getByText("Data unavailable",{exact:true})).toHaveCount(0)
  await expect(source.getByRole("list",{name:"Top three clients",exact:true})).toHaveCount(0)
  await expect(source.getByRole("list",{name:"Top three stages",exact:true})).toContainText("Packaging")
})

test("ranking errors can be retried independently of the analysis KPIs",async({page})=>{
  await mock(page)
  let failed=true
  await page.route("**/api/v1/map/runs/*/insights?*",async route=>{
    if(failed){failed=false;return route.fulfill({status:503,json:{detail:"Fictional temporary source failure"}})}
    await route.fallback()
  })
  await page.goto("/map")
  await expect(page.getByText("Stage ranking could not be loaded",{exact:true})).toBeVisible()
  await page.getByRole("button",{name:"Retry stage ranking",exact:true}).click()
  await expect(page.getByRole("list",{name:"Top three stages",exact:true})).toContainText("Packaging")
})
