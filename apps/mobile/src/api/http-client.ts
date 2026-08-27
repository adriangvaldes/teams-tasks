import { isErrorEnvelope } from '@teams-tasks/shared'
import { API_BASE_URL, API_TIMEOUT_MS } from '@/config/env'
import { ApiError } from './api-error'

type QueryPrimitive = string | number | boolean | undefined | null
type QueryValue = QueryPrimitive | readonly QueryPrimitive[]

export function buildQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      const list = value.filter(
        (entry) => entry !== undefined && entry !== null && entry !== '',
      )

      if (list.length > 0) search.set(key, list.join(','))
      continue
    }

    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }

  const query = search.toString()

  return query ? `?${query}` : ''
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

function buildSignal(signal: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(API_TIMEOUT_MS)

  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

async function performFetch(
  path: string,
  { method = 'GET', body, signal }: RequestOptions,
): Promise<Response> {
  const hasBody = body !== undefined

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: buildSignal(signal),
      headers: {
        Accept: 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    if (signal?.aborted) throw error

    throw ApiError.network(
      error instanceof Error ? error.message : 'Falha de rede',
    )
  }
}

function toApiError(status: number, payload: unknown): ApiError {
  if (isErrorEnvelope(payload)) {
    return new ApiError(
      status,
      payload.error.code,
      payload.error.message,
      payload.error.details ?? [],
    )
  }

  return new ApiError(
    status,
    'INTERNAL_ERROR',
    `Resposta inesperada do servidor (HTTP ${status})`,
  )
}

async function request<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const response = await performFetch(path, options)

  if (response.status === 204) {
    return undefined as TResponse
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw toApiError(response.status, payload)
  }

  return payload as TResponse
}

export const httpClient = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body }),

  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
}
