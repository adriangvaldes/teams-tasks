import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/api-error'

const GC_TIME_MS = 1000 * 60 * 60 * 24

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: GC_TIME_MS,

        retry: (failureCount, error) => {
          if (
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          ) {
            return false
          }

          return failureCount < 2
        },

        refetchOnReconnect: true,
      },

      mutations: { retry: 0 },
    },
  })
}
