import { useEffect, useState } from "react"
import { MetricCard } from "@/shared/components"
import { loadSourceInsights, localCalendarDate, type SourceDeviationInsights } from "../sourceInsights"

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value + "T00:00:00Z"))
}
const count = (value: number) => value.toLocaleString()
const scopeHelp = "Top three stages by distinct deviations opened in the displayed past 12 months, across the selected analysis's complete verified source snapshot. Analysis filters and Cluster groups do not change this source-wide ranking. Shares use all deviations in that period. Stage names use recorded values where available; otherwise specific process steps, then unambiguous responsible departments, are grouped into Manufacturing, Packaging, QC and other stages. This suggested classification does not establish a common root cause. Missing and future opened dates are excluded."

export function SourceInsights({ runId, snapshotId, refreshKey }: { runId: string; snapshotId: string | null; refreshKey: string }) {
  const [asOf, setAsOf] = useState(localCalendarDate), [retry, setRetry] = useState(0)
  const [data, setData] = useState<SourceDeviationInsights | null>(null), [error, setError] = useState("")
  useEffect(() => {
    const timer = window.setInterval(() => setAsOf(localCalendarDate()), 60000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    setData(null); setError("")
    loadSourceInsights(runId, asOf, snapshotId, controller.signal).then(value => {
      if (!controller.signal.aborted) setData(value)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Stage ranking could not be loaded.")
    })
    return () => controller.abort()
  }, [runId, snapshotId, refreshKey, asOf, retry])

  const ranking = data?.stages
  const coverage = data?.available && ranking
    ? `${count(ranking.knownCount)} of ${count(data.windowDeviationCount!)} deviations have a usable stage; ${count(ranking.missingCount)} are unavailable. ${count(ranking.mappedCount)} stages are grouped from process step or department.`
    : ""
  const footer = data?.available
    ? `${dateLabel(data.dateFrom)} – ${dateLabel(data.dateTo)} · by date opened`
    : "Past 12 months · complete verified source"

  return <section aria-label="Past 12 months source rankings" className="min-w-0 [&>.map-kpi-card]:h-full">
    <MetricCard label="Top stages · past 12 months" help={footer} tooltip={`${scopeHelp}${coverage ? " Stage coverage: " + coverage : ""}`}>
      {error ? <div role="status" className="rounded-lg bg-suite-surface/70 p-3">
        <p className="text-sm font-bold text-suite-slate">Stage ranking could not be loaded</p>
        <p className="mt-1 text-xs leading-5 text-suite-muted">{error}</p>
        <button type="button" onClick={() => setRetry(value => value + 1)} className="map-secondary mt-3 text-xs!">Retry stage ranking</button>
      </div> : !data ? <p role="status" className="text-sm text-suite-muted">Checking stage data…</p>
        : !data.available ? <div className="rounded-lg bg-suite-surface/70 p-3">
          <p className="text-sm font-bold text-suite-slate">Stage data unavailable</p>
          <p className="mt-1 text-xs leading-5 text-suite-muted">The selected analysis needs its verified source snapshot to establish this ranking.</p>
        </div> : ranking && <>
          <p className="mb-3 text-xs leading-5 text-suite-muted">Full source · <span className="font-bold tabular-nums text-suite-blue">{count(data.windowDeviationCount!)} deviations in period</span></p>
          {ranking.rows.length ? <>
            <ol aria-label="Top three stages" className="space-y-2">{ranking.rows.map((row, index) => <li key={row.label} className="flex min-w-0 items-start gap-2 text-xs leading-5">
              <span className="text-suite-muted">{index + 1}</span>
              <span className="min-w-0 flex-1 break-words font-bold text-suite-ink">{row.label}</span>
              <span className="shrink-0 font-bold tabular-nums">{count(row.count)} <span className="ml-1 font-normal text-suite-muted">{row.percent.toFixed(1)}%</span></span>
            </li>)}</ol>
            <p aria-label="Stages combined contribution" className="mt-3 border-t border-suite-line-soft pt-2 text-xs leading-5 text-suite-muted"><strong className="mr-1 text-lg font-bold tabular-nums text-suite-blue">{ranking.topShare.toFixed(1)}%</strong> combined contribution</p>
          </> : <div className="rounded-lg bg-suite-surface/70 p-3">
            <p className="text-sm font-bold text-suite-slate">{data.windowDeviationCount === 0 ? "No deviations in this period" : "Stage data unavailable"}</p>
            {ranking.unavailableReason && <p className="mt-1 text-xs leading-5 text-suite-muted">{ranking.unavailableReason}</p>}
          </div>}
          {ranking.missingCount > 0 && <p className="mt-1 text-[11px] leading-4 text-suite-muted">{count(ranking.knownCount)} of {count(data.windowDeviationCount!)} deviations have a usable stage.</p>}
          {ranking.cutoffTied && <p className="mt-1 text-[11px] leading-4 text-suite-muted">Third place is tied; alphabetical order selects the three shown.</p>}
          {(data.undatedCount > 0 || data.futureDatedCount > 0) && <p className="mt-1 text-[11px] leading-4 text-suite-muted">Excluded dates: {count(data.undatedCount)} missing / invalid · {count(data.futureDatedCount)} future.</p>}
        </>}
    </MetricCard>
  </section>
}
