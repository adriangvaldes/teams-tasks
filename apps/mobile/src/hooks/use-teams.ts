import {
  type InfiniteData,
  useInfiniteQuery,
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

export const TEAMS_PAGE_SIZE = 20

const TEAM_OPTIONS_LIMIT = 100

type TeamPages = InfiniteData<ListResponse<TeamDTO>>

export function useTeams(filters: TeamListFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.teams.list(filters),
    queryFn: ({ pageParam, signal }) =>
      teamsApi.list(
        { ...filters, limit: TEAMS_PAGE_SIZE, offset: pageParam },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore
        ? lastPage.meta.offset + lastPage.meta.limit
        : undefined,
  })
}

export function flattenTeamPages(pages: TeamPages | undefined): {
  teams: TeamDTO[]
  total: number
} {
  if (!pages) return { teams: [], total: 0 }

  return {
    teams: pages.pages.flatMap((page) => page.data),
    total: pages.pages[0]?.meta.total ?? 0,
  }
}

export function useTeamOptions() {
  return useQuery({
    queryKey: queryKeys.teams.options(),
    queryFn: ({ signal }) =>
      teamsApi.list({ limit: TEAM_OPTIONS_LIMIT, sort: 'name:asc' }, signal),
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
      queryClient.setQueryData<ItemResponse<TeamDTO>>(
        queryKeys.teams.detail(created.data.id),
        created,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })

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

      const snapshot = queryClient.getQueriesData({
        queryKey: queryKeys.teams.lists(),
      })

      const lists = queryClient.getQueriesData<TeamPages>({
        queryKey: queryKeys.teams.lists(),
      })

      for (const [key, current] of lists) {
        if (!current) continue

        const contains = current.pages.some((page) =>
          page.data.some((team) => team.id === teamId),
        )
        if (!contains) continue

        queryClient.setQueryData<TeamPages>(key, {
          ...current,
          pages: current.pages.map((page) => ({
            data: page.data.filter((team) => team.id !== teamId),
            meta: { ...page.meta, total: Math.max(0, page.meta.total - 1) },
          })),
        })
      }

      return { snapshot }
    },

    onError: (_error, _teamId, context) => {
      for (const [key, value] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, value)
      }
    },

    onSettled: (_data, _error, teamId) => {
      queryClient.removeQueries({ queryKey: queryKeys.teams.detail(teamId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })

      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}
