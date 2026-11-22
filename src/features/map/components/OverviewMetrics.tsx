import type { ReactNode } from "react"
import { OnTimeClosureMetric } from "./OnTimeClosureMetric"
import { MetricCard } from "@/shared/components"
import { mapHelp } from "../helpText"
import { formatShare, overviewMetrics } from "../overviewMetrics"
import type { CapaRelationship, DeviationRecord } from "../types"
import { CriticalityMetric } from "./CriticalityMetric"
import { TopDrTypeMetric } from "./TopDrTypeMetric"

export function OverviewMetrics({ records, capas, sourceAvailable, children }: {
  records: DeviationRecord[]
  capas?: CapaRelationship[]
  sourceAvailable: boolean
  children?: ReactNode
}) {
  const metrics = overviewMetrics(records, capas, sourceAvailable)
  const count = (value: number) => value.toLocaleString()
  const { total, implemented, raised } = metrics
  return (
    <section aria-label="Analysis KPIs" className="space-y-3">
      <div className="map-overview-summary-grid">
        <OnTimeClosureMetric records={records} />
        <CriticalityMetric metrics={metrics} />
        <MetricCard
          label="CAPA implemented / raised"
          value={implemented === null || raised === null ? "Not available" : <>{count(implemented)}<span className="text-lg font-normal text-suite-muted"> / {count(raised)}</span></>}
          valueSize={implemented === null ? "text" : "number"}
          help={implemented === null ? total ? "CAPA source links unavailable" : "No deviations in this view" : raised ? "Distinct linked CAPAs · source status Closed - Done" : "No linked CAPAs retained in this view"}
          tooltip={mapHelp.capaImplemented}
        >
          {implemented !== null && raised !== null && <p className="mt-1 text-sm leading-5 font-bold tabular-nums text-suite-blue">{formatShare(implemented, raised)} <span className="font-normal text-suite-muted">of CAPAs raised</span></p>}
        </MetricCard>
      </div>
      <div className="map-overview-rankings-grid">
        <TopDrTypeMetric metrics={metrics} />
        {children}
      </div>
    </section>
  )
}
