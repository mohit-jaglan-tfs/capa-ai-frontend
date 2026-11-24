// Set these flags to true when the corresponding stages are ready to be shown.
export const SHOW_ANALYSIS = false
export const SHOW_CLOSURE = false

export function isAuthorStageVisible(stageId: number): boolean {
  return stageId <= 3 || (stageId <= 7 ? SHOW_ANALYSIS : SHOW_CLOSURE)
}
