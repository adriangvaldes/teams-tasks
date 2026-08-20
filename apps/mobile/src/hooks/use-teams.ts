import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  CreateTeamBody,
  TeamDTO,
  UpdateTeamBody,
} from '@teams-tasks/shared'
import { queryKeys } from '@/api/query-keys'
import { type TeamListFilters, teamsApi } from '@/api/teams.api'
import type { ItemResponse, ListResponse } from '@/api/types'

export function useTeams(filters: TeamListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.teams.list(filters),
    queryFn: ({ signal }) => teamsApi.list(filters, signal),
    // Mantém a página anterior visível enquanto a nova carrega: evita o
    // "flash" de lista vazia a cada letra digitada na busca.
    placeholderData: keepPreviousData,
  })
}

export function useTeam(teamId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.teams.detail(teamId ?? ''),
    queryFn: ({ signal }) => teamsApi.detail(teamId as string, signal),
    enabled: Boolean(teamId),
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateTeamBody) => teamsApi.create(body),
    onSuccess: (created) => {
      // Semeia o detalhe para que navegar direto ao time recém-criado não
      // mostre loading.
      queryClient.setQueryData<ItemResponse<TeamDTO>>(
        queryKeys.teams.detail(created.data.id),
        created,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.lists() })
    },
  })
}

export function useUpdateTeam(teamId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: UpdateTeamBody) => teamsApi.update(teamId, body),
    onSuccess: (updated) => {
      queryClient.setQueryData<ItemResponse<TeamDTO>>(
        queryKeys.teams.detail(teamId),
        updated,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.lists() })
      // A cor do time aparece nos chips das tarefas: renomear ou recolorir
      // precisa refletir lá também.
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}

export function useDeleteTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (teamId: string) => teamsApi.remove(teamId),
    onMutate: async (teamId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.teams.lists() })

      const snapshot = queryClient.getQueriesData<ListResponse<TeamDTO>>({
        queryKey: queryKeys.teams.lists(),
      })

      // Remoção otimista: a lista responde na hora ao toque em "Excluir".
      queryClient.setQueriesData<ListResponse<TeamDTO>>(
        { queryKey: queryKeys.teams.lists() },
        (current) =>
          current
            ? {
                data: current.data.filter((team) => team.id !== teamId),
                meta: { ...current.meta, total: current.meta.total - 1 },
              }
            : current,
      )

      return { snapshot }
    },
    onError: (_error, _teamId, context) => {
      for (const [key, value] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, value)
      }
    },
    onSettled: (_data, _error, teamId) => {
      queryClient.removeQueries({ queryKey: queryKeys.teams.detail(teamId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.lists() })
      // Apagar um time desvincula tarefas: os chips precisam ser recarregados.
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}
