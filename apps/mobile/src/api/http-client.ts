import { isErrorEnvelope } from '@teams-tasks/shared'
import { API_BASE_URL, API_TIMEOUT_MS } from '@/config/env'
import { ApiError } from './api-error'

type QueryValue = string | number | boolean | undefined | null

/** Monta a query string ignorando filtros não preenchidos. */
export function buildQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
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

/**
 * Combina o sinal do chamador com um timeout próprio.
 *
 * Rede móvel pode pendurar a conexão indefinidamente; sem timeout a tela ficaria
 * em loading para sempre. O React Query cancela queries obsoletas pelo signal
 * dele, então os dois precisam valer ao mesmo tempo.
 */
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
    // Cancelamento pelo React Query não é falha: repassamos o erro original
    // para que ele trate como query descartada, e não como erro de rede
    // exibido ao usuário.
    if (signal?.aborted) throw error

    throw ApiError.network(
      error instanceof Error ? error.message : 'Falha de rede',
    )
  }
}

/** Converte uma resposta de erro no ApiError correspondente. */
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

  // DELETE responde 204 sem corpo: tentar ler JSON aqui lançaria.
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
