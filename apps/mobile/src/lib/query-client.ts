import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/api-error'

/** 24h: o cache persistido precisa sobreviver ao app fechado. */
const GC_TIME_MS = 1000 * 60 * 60 * 24

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dados de tarefa mudam com frequência moderada; 30s evita refetch a
        // cada navegação sem deixar a tela desatualizada por muito tempo.
        staleTime: 30_000,
        gcTime: GC_TIME_MS,

        /**
         * Não insistir em erro do cliente. Repetir um 404 ou um 400 de
         * validação três vezes só atrasa a mensagem de erro na tela — o
         * resultado seria o mesmo. Falha de rede e 5xx, sim, valem retry.
         */
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

      // Mutação repetida automaticamente pode duplicar efeito (criar duas
      // tarefas). O usuário reenvia se quiser.
      mutations: { retry: 0 },
    },
  })
}
