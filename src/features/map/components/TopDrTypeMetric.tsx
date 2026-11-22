import { MetricCard } from "@/shared/components"
import { mapHelp } from "../helpText"
import { formatShare, type overviewMetrics } from "../overviewMetrics"

type Metrics = Pick<ReturnType<typeof overviewMetrics>, "total" | "topDrTypes" | "topDrCumulativeCount" | "drTypeCutoffTied" | "unknownDrType">
export function TopDrTypeMetric({ metrics }: { metrics: Metrics }) {
  const { total, topDrTypes, topDrCumulativeCount, drTypeCutoffTied, unknownDrType } = metrics
  return <MetricCard label="Top DR types"
    help={topDrTypes.length ? `Top ${topDrTypes.length} combined · ${topDrCumulativeCount.toLocaleString()} of ${total.toLocaleString()} deviations${unknownDrType ? ` · ${unknownDrType.toLocaleString()} unknown DR type` : ""}` : "No usable DR type in this view"}
    tooltip={mapHelp.topDrType + (drTypeCutoffTied ? " A tie reaches beyond third place; the first three alphabetically are shown." : "")}>
    {topDrTypes.length ? <>
      <p className="mb-3 text-xs leading-5 text-suite-muted">Current view · <span className="font-bold tabular-nums text-suite-blue">{total.toLocaleString()} {total === 1 ? "deviation" : "deviations"}</span></p>
      <ol aria-label="Top three DR types" className="space-y-2">{topDrTypes.map((type,index)=><li key={type.label} className="flex min-w-0 items-start gap-2 text-xs leading-5">
        <span className="text-suite-muted">{index+1}</span>
        <span className="min-w-0 flex-1 break-words font-bold text-suite-ink">{type.label}</span>
        <span className="shrink-0 font-bold tabular-nums">{type.count.toLocaleString()} <span className="ml-1 font-normal text-suite-muted">{formatShare(type.count,total)}</span></span>
      </li>)}</ol>
      <p aria-label="DR types combined contribution" className="mt-3 border-t border-suite-line-soft pt-2 text-xs leading-5 text-suite-muted"><strong className="mr-1 text-lg font-bold tabular-nums text-suite-blue">{formatShare(topDrCumulativeCount,total)}</strong> combined contribution</p>
    </> : <p className="text-lg font-bold text-suite-slate">Not available</p>}
  </MetricCard>
}
