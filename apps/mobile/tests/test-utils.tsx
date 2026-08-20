import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderOptions, render } from '@testing-library/react-native'
import type { ReactElement, ReactNode } from 'react'

/**
 * QueryClient de teste: sem retry e sem cache entre casos.
 *
 * Retry ligado faria um teste de erro esperar os backoffs antes de assertar, e
 * cache compartilhado deixaria um teste enxergar dados semeados por outro.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

/**
 * `render` é ASSÍNCRONO no @testing-library/react-native 14 (mudou junto com o
 * modo concorrente do React 19), então este helper também é.
 */
export async function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  const result = await render(ui, { wrapper: Wrapper, ...options })

  return { queryClient, ...result }
}

/** Resposta de listagem no formato do envelope da API. */
export function listResponse<TItem>(items: TItem[]) {
  return {
    data: items,
    meta: {
      total: items.length,
      limit: 20,
      offset: 0,
      hasMore: false,
    },
  }
}

/**
 * Substitui o fetch global por um roteador simples de URL → payload.
 * Mais legível que encadear mockResolvedValueOnce quando a tela faz mais de
 * uma requisição e a ordem não é garantida.
 */
export function mockFetchRoutes(
  routes: Array<{ match: string; status?: number; body: unknown }>,
): jest.Mock {
  const fetchMock = jest.fn(async (input: string | URL | Request) => {
    const url = String(input)
    const route = routes.find((candidate) => url.includes(candidate.match))

    if (!route) {
      throw new Error(`Nenhuma rota mockada para ${url}`)
    }

    return {
      ok: (route.status ?? 200) < 400,
      status: route.status ?? 200,
      json: async () => route.body,
    } as Response
  })

  globalThis.fetch = fetchMock as unknown as typeof fetch

  return fetchMock
}
