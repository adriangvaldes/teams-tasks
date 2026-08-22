import type { TeamSortField } from '../ports/out/team-repository.port'
import type { SortCriteria } from './pagination.dto'

export interface TeamOutput {
  id: string
  name: string
  colorHex: string
  description: string | null
  taskCount: number
  createdAt: Date
  updatedAt: Date
}

export interface TeamSummaryOutput {
  id: string
  name: string
  colorHex: string
}

export interface CreateTeamInput {
  name: string
  colorHex: string
  description?: string | null | undefined
}

export interface UpdateTeamInput {
  teamId: string
  name?: string | undefined
  colorHex?: string | undefined
  description?: string | null | undefined
}

export interface GetTeamInput {
  teamId: string
}

export interface DeleteTeamInput {
  teamId: string
}

export interface ListTeamsInput {
  search?: string | undefined
  limit: number
  offset: number
  sort: SortCriteria<TeamSortField>
}
