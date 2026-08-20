import type {
  CreateTeamBody,
  TeamDTO,
  TeamSortOption,
  UpdateTeamBody,
} from '@teams-tasks/shared'
import { buildQueryString, httpClient } from './http-client'
import type { ItemResponse, ListResponse } from './types'

export interface TeamListFilters {
  search?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
  sort?: TeamSortOption | undefined
}

const BASE_PATH = '/api/teams'

export const teamsApi = {
  list: (filters: TeamListFilters, signal?: AbortSignal) =>
    httpClient.get<ListResponse<TeamDTO>>(
      `${BASE_PATH}${buildQueryString({ ...filters })}`,
      signal,
    ),

  detail: (teamId: string, signal?: AbortSignal) =>
    httpClient.get<ItemResponse<TeamDTO>>(`${BASE_PATH}/${teamId}`, signal),

  create: (body: CreateTeamBody) =>
    httpClient.post<ItemResponse<TeamDTO>>(BASE_PATH, body),

  update: (teamId: string, body: UpdateTeamBody) =>
    httpClient.put<ItemResponse<TeamDTO>>(`${BASE_PATH}/${teamId}`, body),

  remove: (teamId: string) => httpClient.delete(`${BASE_PATH}/${teamId}`),
} as const
