import type { DeviationRecord, Filters, MapDataset, MapFilterKey } from "./types"
import { dueStatusLabels } from "./deadlines"
import { compareClusterGroups } from "./clusterGroupOrder"

export type MapFilterContext = Pick<MapDataset, "clusters" | "capas" | "analysis">
export const LINKED_CAPA = "Linked CAPA"
export const NO_CAPA_LINK = "No retained CAPA link"
export const PAST_DUE = "Past due (open overdue or closed late)"
const UNKNOWN = "Not available"

function lookup(context?: MapFilterContext) {
  const links = new Map<string, Set<string>>()
  for (const capa of context?.capas ?? [])
    for (const id of capa.recordIds) {
      if (!links.has(id)) links.set(id, new Set())
      links.get(id)!.add(capa.status.trim() || "Not provided")
    }
  return {
    links,
    groups: new Map(context?.clusters.map(cluster => [cluster.id, cluster.parentTheme]) ?? []),
    linksAvailable: !!context?.analysis.sourceAvailable && context.capas !== undefined,
  }
}

function values(record: DeviationRecord, key: string, context: ReturnType<typeof lookup>): string[] {
  if (key === "capaLink" || key === "capaStatus") {
    if (!context.linksAvailable) return [UNKNOWN]
    const statuses = context.links.get(record.id)
    return key === "capaLink" ? [statuses?.size ? LINKED_CAPA : NO_CAPA_LINK] : [...(statuses ?? [])]
  }
  if (key === "dueStatus") {
    const status = record.dueStatus ?? "unavailable"
    return [dueStatusLabels[status], ...(["open_overdue", "closed_late"].includes(status) ? [PAST_DUE] : [])]
  }
  if (key === "clusterGroup") return [context.groups.get(record.clusterId) || UNKNOWN]
  return [String(record[key as keyof DeviationRecord] ?? UNKNOWN)]
}

export function filterMapRecords<K extends string>(source: DeviationRecord[], filters: Filters<K>, context?: MapFilterContext) {
  const index = lookup(context)
  return source.filter(record => Object.entries(filters).every(([key, selected]) => selected === "All" || values(record,key,index).includes(selected as string)))
}

export function mapFilterOptions(source: DeviationRecord[], key: MapFilterKey, context?: MapFilterContext): string[] {
  const index = lookup(context)
  if (key === "capaLink") return index.linksAvailable ? [LINKED_CAPA, NO_CAPA_LINK] : [UNKNOWN]
  if (key === "dueStatus") return source.some(record => record.dueDate)
    ? [PAST_DUE, "Open overdue", "Closed late", "Closed on time", "Open within due date", "Cancelled", UNKNOWN]
    : [UNKNOWN]
  const options = [...new Set(source.flatMap(record => values(record,key,index)))]
  return options.sort(key === "clusterGroup" ? compareClusterGroups : (a,b) => a.localeCompare(b,undefined,{numeric:true}))
}
