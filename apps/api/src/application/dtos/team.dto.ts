import type { TeamSortField } from '../ports/out/team-repository.port'
import type { SortCriteria } from './pagination.dto'

// ---------- Saida ----------

/**
 * Visao de aplicacao de um time. Note que `createdAt` e `Date`, nao string ISO:
 * serializacao e responsabilidade do adapter HTTP, nao da aplicacao.
 */
export interface TeamOutput {
  id: string
  name: string
  colorHex: string
  description: string | null
  taskCount: number
  createdAt: Date
  updatedAt: Date
}

/** Projecao minima usada dentro da tarefa (chip de cor). */
export interface TeamSummaryOutput {
  id: string
  name: string
  colorHex: string
}

// ---------- Entrada (uma por use case) ----------

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
