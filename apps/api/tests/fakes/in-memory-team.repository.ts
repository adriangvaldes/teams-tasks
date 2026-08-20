import type { PaginatedResult } from '../../src/application/dtos/pagination.dto'
import type {
  ListTeamsCriteria,
  TeamRepository,
} from '../../src/application/ports/out/team-repository.port'
import type { UniqueEntityId } from '../../src/domain/shared/unique-entity-id'
import type { Team } from '../../src/domain/team/team.entity'
import type { TeamName } from '../../src/domain/team/value-objects/team-name.vo'

/**
 * Implementacao em memoria da porta TeamRepository.
 *
 * E o retorno pratico de ter definido a porta com tipos de dominio: os testes
 * unitarios dos casos de uso rodam em milissegundos, sem Docker e sem banco,
 * exercitando exatamente o mesmo contrato que o adapter Prisma cumpre.
 */
export class InMemoryTeamRepository implements TeamRepository {
  readonly items: Team[] = []

  async findById(id: UniqueEntityId): Promise<Team | null> {
    return this.items.find((team) => team.id.equals(id)) ?? null
  }

  async findManyByIds(ids: readonly UniqueEntityId[]): Promise<Team[]> {
    return this.items.filter((team) => ids.some((id) => team.id.equals(id)))
  }

  async findByName(name: TeamName): Promise<Team | null> {
    return this.items.find((team) => team.name.equals(name)) ?? null
  }

  async list(criteria: ListTeamsCriteria): Promise<PaginatedResult<Team>> {
    let result = [...this.items]

    if (criteria.search) {
      const term = criteria.search.toLowerCase()

      result = result.filter(
        (team) =>
          team.name.value.toLowerCase().includes(term) ||
          (team.description?.toLowerCase().includes(term) ?? false),
      )
    }

    const direction = criteria.sort.direction === 'asc' ? 1 : -1

    result.sort((a, b) => {
      const comparison =
        criteria.sort.field === 'name'
          ? a.name.value.localeCompare(b.name.value)
          : a.createdAt.getTime() - b.createdAt.getTime()

      return comparison * direction
    })

    return {
      items: result.slice(criteria.offset, criteria.offset + criteria.limit),
      total: result.length,
    }
  }

  async create(team: Team): Promise<void> {
    this.items.push(team)
  }

  async update(team: Team): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(team.id))

    if (index >= 0) this.items[index] = team
  }

  async delete(id: UniqueEntityId): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(id))

    if (index >= 0) this.items.splice(index, 1)
  }
}
