import { mockRequestJson } from "./mockBackend"

// The imported AUTHOR prototype uses its local sample backend.
export function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  return mockRequestJson<T>(path, init)
}
