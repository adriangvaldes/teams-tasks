import type { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import type { Team } from '../../../domain/team/team.entity'
import type { TeamName } from '../../../domain/team/value-objects/team-name.vo'
import type {
  PaginatedResult,
  PaginationCriteria,
  SortCriteria,
} from '../../dtos/pagination.dto'

export type TeamSortField = 'name' | 'createdAt'

export interface ListTeamsCriteria extends PaginationCriteria {
  search?: string | undefined
  sort: SortCriteria<TeamSortField>
}

/**
 * Porta de saida do agregado Team. Repare que so aparecem tipos de dominio na
 * assinatura - nada de Prisma, SQL ou HTTP. Qualquer implementacao serve
 * (Prisma, em memoria nos testes, outro banco amanha).
 */
export interface TeamRepository {
  findById(id: UniqueEntityId): Promise<Team | null>
  findManyByIds(ids: readonly UniqueEntityId[]): Promise<Team[]>
  findByName(name: TeamName): Promise<Team | null>
  list(criteria: ListTeamsCriteria): Promise<PaginatedResult<Team>>
  create(team: Team): Promise<void>
  update(team: Team): Promise<void>
  delete(id: UniqueEntityId): Promise<void>
}
