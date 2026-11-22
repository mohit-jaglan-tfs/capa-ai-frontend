import { test, expect, type Locator, type Page } from "@playwright/test"
import fs from "node:fs"

const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/map-dataset.json", import.meta.url), "utf8"))
test.skip(process.env.MAP_REAL_DATA === "1", "KPI scoping and unknown classifications use fictional responses")
const clone = () => {
  const value = structuredClone(fixture)
  Object.assign(value.records[0], { criticality: "Minor", drType: "Site Deviation", daysOpen: 10 })
  Object.assign(value.records[1], { criticality: "Major", drType: "Product Deviation", daysOpen: 20, department: "Manufacturing" })
  Object.assign(value.records[2], { criticality: "Critical", drType: "Trend", daysOpen: 200 })
  return value
}
const metric = (region: Locator, label: string) => region.getByText(label, { exact: true }).locator("..")
const severity = (container: Locator, level: string) => container.locator("dt").filter({ hasText: new RegExp(`^${level}$`) }).locator("..").getByRole("definition")

async function mock(page: Page, value: any) {
  await page.route("**/map/dataset", route => route.fulfill({ json: value }))
  await page.route("**/api/v1/map/runs?*", route => route.fulfill({ json: { items: [] } }))
}

test("cluster summary separates severity counts and shares, including unknown classifications", async ({ page }) => {
  const value = clone()
  value.records.push({ ...structuredClone(value.records[0]), id: "UNKNOWN-TEST", criticality: "Not provided" })
  value.analysis.recordCount = value.records.length
  await mock(page, value)
  await page.goto("/map")
  await page.getByRole("region", { name: "Analysis KPIs", exact: true }).waitFor()
  const table = page.locator(".map-cluster-table")
  if (await table.isVisible()) {
    await expect(table.getByRole("columnheader")).toHaveText(["Cluster summary", "Deviations", "Minor", "Major", "Critical", "Similarity"])
    const first = table.locator("tbody tr").first()
    await expect(first).toContainText("1 other / unknown criticality")
    await expect(first.getByRole("cell").nth(0)).toHaveText("3")
    await expect(first.getByRole("cell").nth(1)).toHaveText(/^1\s*33\.3%$/)
    await expect(first.getByRole("cell").nth(2)).toHaveText(/^1\s*33\.3%$/)
    await expect(first.getByRole("cell").nth(3)).toHaveText(/^0\s*0\.0%$/)
  } else {
    const first = page.locator(".map-cluster-cards > li").first()
    await expect(severity(first, "Minor")).toHaveText(/^1\s*33\.3%$/)
    await expect(severity(first, "Major")).toHaveText(/^1\s*33\.3%$/)
    await expect(severity(first, "Critical")).toHaveText(/^0\s*0\.0%$/)
    await expect(first).toContainText(/Other \/ unknown:\s*1 \(33\.3%\)/)
  }
  await expect(page.getByText("Major/Critical", { exact: true })).toHaveCount(0)
  await page.getByRole("combobox", { name: "Sites", exact: true }).selectOption(value.records[1].site)
  if (await table.isVisible()) {
    const first = table.locator("tbody tr").first()
    await expect(first.getByRole("cell").nth(0)).toHaveText("1")
    await expect(first.getByRole("cell").nth(1)).toHaveText(/^0\s*0\.0%$/)
    await expect(first.getByRole("cell").nth(2)).toHaveText(/^1\s*100\.0%$/)
    await expect(first).not.toContainText("unknown criticality")
  } else {
    const first = page.locator(".map-cluster-cards > li").first()
    await expect(severity(first, "Major")).toHaveText(/^1\s*100\.0%$/)
    await expect(first).not.toContainText("Other / unknown")
  }
})

test("cluster KPIs scope criticality, median duration and top DR type to the cluster and its filters", async ({ page }) => {
  const value = clone()
  await mock(page, value)
  await page.goto(`/map/clusters/${value.records[0].clusterId}`)
  const kpis = page.getByRole("region", { name: "Cluster KPIs", exact: true })
  await expect(metric(kpis, "Deviations in cluster")).toContainText("Of 2 in the saved cluster")
  await expect(metric(kpis, "Criticality")).toContainText("Out of 2 deviations")
  await expect(severity(kpis, "Minor")).toHaveText(/^1\s*50\.0%$/)
  await expect(severity(kpis, "Major")).toHaveText(/^1\s*50\.0%$/)
  await expect(severity(kpis, "Critical")).toHaveText(/^0\s*0\.0%$/)
  await expect(metric(kpis, "Median days open")).toContainText("15 days")
  await expect(metric(kpis, "Top DR types")).toContainText("Top 2 combined · 2 of 2 deviations")
  await kpis.getByRole("button", { name: "About Top DR types", exact: true }).click()
  await expect(page.getByRole("tooltip")).toContainText("Top three known deviation record types")
  await page.keyboard.press("Escape")
  await expect(page.getByRole("button", { name: "Review records", exact: true })).toHaveCount(0)
  await expect(kpis.getByText("Major / Critical", { exact: true })).toHaveCount(0)
  await page.getByRole("combobox", { name: "Sites", exact: true }).selectOption(value.records[1].site)
  await expect(severity(kpis, "Major")).toHaveText(/^1\s*100\.0%$/)
  await expect(severity(kpis, "Minor")).toHaveText(/^0\s*0\.0%$/)
  await expect(metric(kpis, "Criticality")).toContainText("Out of 1 deviation")
  await expect(metric(kpis, "Top DR types")).toContainText("Product Deviation")
  await expect(metric(kpis, "Top DR types")).toContainText("Top 1 combined · 1 of 1 deviation")
  await expect(metric(kpis, "Median days open")).toContainText("20 days")
  await page.getByRole("combobox", { name: "Department", exact: true }).selectOption(value.records[0].department)
  await expect(metric(kpis, "Criticality")).toContainText("Out of 0 deviations")
  await expect(severity(kpis, "Major")).toHaveText(/^0\s*—$/)
  await expect(metric(kpis, "Top DR types")).toContainText("Not available")
  await expect(metric(kpis, "Median days open")).toContainText("Not available")
})

test("KPI cards align within each row, keep readable values and fit the available content width", async ({ page }) => {
  const value = clone()
  await mock(page, value)
  for (const [path, name] of [["/map", "Analysis KPIs"], [`/map/clusters/${value.records[0].clusterId}`, "Cluster KPIs"]]) {
    await page.goto(path)
    const kpis = page.getByRole("region", { name, exact: true })
    await expect(kpis.locator(".map-kpi-card")).toHaveCount(name === "Analysis KPIs" ? 5 : 4)
    const bounds = (await kpis.boundingBox())!
    const cards = await kpis.locator(".map-kpi-card").evaluateAll(items => items.map(item => {
      const rect = item.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    }))
    for (const card of cards) {
      expect(card.x).toBeGreaterThanOrEqual(bounds.x)
      expect(card.x + card.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1)
      for (const other of cards.filter(other => Math.abs(card.y - other.y) < 1)) expect(Math.abs(card.height - other.height)).toBeLessThan(1)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
    const headerSize = await kpis.locator(".map-kpi-card > p").first().evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    const valueSize = await kpis.locator(".map-kpi-card > div > p, .map-kpi-card > div dd").first().evaluate(el => parseFloat(getComputedStyle(el).fontSize))
    expect(valueSize).toBeGreaterThan(headerSize)
  }
})
