import {
  DEFAULT_FILTER_STATE,
  type Facets,
  type FilterState,
  type UserPage,
} from './types'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function toSearchParams(
  state: FilterState,
  extra: Record<string, string> = {},
): URLSearchParams {
  const params = new URLSearchParams()

  if (state.q.length > 0) {
    params.set('q', state.q)
  }
  for (const value of state.nationalities) {
    params.append('nationalities', value)
  }
  for (const value of state.hobbies) {
    params.append('hobbies', value)
  }
  if (state.sort !== DEFAULT_FILTER_STATE.sort) {
    params.set('sort', state.sort)
  }
  if (state.order !== DEFAULT_FILTER_STATE.order) {
    params.set('order', state.order)
  }
  for (const [key, value] of Object.entries(extra)) {
    params.set(key, value)
  }

  return params
}

async function getJson<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${path}?${params.toString()}`, { signal })
  const text = await response.text()

  let body: unknown = null
  try {
    body = JSON.parse(text)
  } catch {
    body = null
  }

  if (!response.ok) {
    const message = (body as { error?: { message?: string } } | null)?.error?.message
    throw new ApiError(message ?? `Request failed with status ${response.status}`, response.status)
  }

  if (body === null) {
    throw new ApiError('Response body was not valid JSON', response.status)
  }

  return body as T
}

export function fetchUsers(
  state: FilterState,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<UserPage> {
  const extra: Record<string, string> = { limit: '30' }
  if (cursor !== null) {
    extra.cursor = cursor
  }
  return getJson<UserPage>('/api/users', toSearchParams(state, extra), signal)
}

export function fetchFacets(state: FilterState, signal?: AbortSignal): Promise<Facets> {
  return getJson<Facets>('/api/facets', toSearchParams(state), signal)
}
