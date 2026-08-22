import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderOptions, render } from '@testing-library/react-native'
import type { ReactElement, ReactNode } from 'react'

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

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
