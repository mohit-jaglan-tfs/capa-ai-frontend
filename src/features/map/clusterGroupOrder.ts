const isOtherGroup = (name: string) => /^others?\b/i.test(name.trim())

/** Keep the classification fallback after all named quality groups. */
export function compareClusterGroups(a: string, b: string) {
  return Number(isOtherGroup(a)) - Number(isOtherGroup(b)) || a.localeCompare(b, undefined, { numeric: true })
}
