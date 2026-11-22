import { Panel } from "@/shared/components"
import type { Cluster, DeviationRecord } from "../types"
import { compareClusterGroups } from "../clusterGroupOrder"

export function ClusterGroups({clusters,records,selected,onChange}: {
  clusters: Cluster[]; records: DeviationRecord[]; selected:string; onChange:(value:string)=>void
}) {
  const byId = new Map(clusters.map(cluster => [cluster.id,cluster.parentTheme]))
  const groups = new Map<string, DeviationRecord[]>()
  for (const record of records) {
    const name = byId.get(record.clusterId)
    if (name) {
      if (!groups.has(name)) groups.set(name,[])
      groups.get(name)!.push(record)
    }
  }
  const names = [...groups.keys()]
  if (selected !== "All" && !groups.has(selected)) names.push(selected)
  names.sort(compareClusterGroups)
  if (!names.length) return null
  const ungrouped = records.filter(record=>!byId.get(record.clusterId)).length
  return <Panel title="Cluster groups" help="Groups use 11 predefined quality categories plus Other / needs classification. Assignment is suggested from cluster titles and record types. Check their source records; a group does not establish a common root cause or change cluster membership.">
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <button type="button" onClick={()=>onChange("All")} aria-pressed={selected==="All"} className="map-secondary text-xs!">All groups · {records.length.toLocaleString()} deviations</button>
      <span className="text-xs text-suite-muted">Select a group to focus the KPIs and cluster summary.</span>
    </div>
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{names.map(name=>{
      const rows = groups.get(name) ?? []
      return <button key={name} type="button" aria-pressed={selected===name} onClick={()=>onChange(selected===name?"All":name)} className={`min-w-0 rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-brand ${selected===name?"border-suite-blue bg-suite-info-wash":"border-suite-line bg-white hover:bg-suite-hover"}`}>
        <span className="block text-sm font-bold">{name}</span>
        <span className="mt-1 block text-xs text-suite-muted">{rows.length.toLocaleString()} {rows.length===1?"deviation":"deviations"} · {new Set(rows.map(row=>row.clusterId)).size} {new Set(rows.map(row=>row.clusterId)).size===1?"cluster":"clusters"}</span>
      </button>
    })}</div>
    {ungrouped>0&&<p className="mt-2 text-xs text-suite-muted">{ungrouped.toLocaleString()} unassigned or ungrouped deviations remain included in All groups.</p>}
  </Panel>
}
