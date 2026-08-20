import type { Prisma } from '@prisma/client'
import type {
  PaginatedResult,
} from '../../../application/dtos/pagination.dto'
import type {
  ListTeamsCriteria,
  TeamRepository,
} from '../../../application/ports/out/team-repository.port'
import type { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import type { Team } from '../../../domain/team/team.entity'
import type { TeamName } from '../../../domain/team/value-objects/team-name.vo'
import { PrismaTeamMapper } from './mappers/prisma-team.mapper'
import type { PrismaClient } from './prisma-client'

/** Adapter de saida: implementa a porta TeamRepository sobre o Prisma. */
export class PrismaTeamRepository implements TeamRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: UniqueEntityId): Promise<Team | null> {
    const row = await this.prisma.team.findUnique({ where: { id: id.value } })

    return row ? PrismaTeamMapper.toDomain(row) : null
  }

  async findManyByIds(ids: readonly UniqueEntityId[]): Promise<Team[]> {
    if (ids.length === 0) return []

    const rows = await this.prisma.team.findMany({
      where: { id: { in: ids.map((id) => id.value) } },
    })

    return rows.map(PrismaTeamMapper.toDomain)
  }

  async findByName(name: TeamName): Promise<Team | null> {
    // Unicidade case-insensitive: "Squad Alpha" e "squad alpha" sao o mesmo
    // time para o usuario, ainda que o unique do Postgres diferencie.
    const row = await this.prisma.team.findFirst({
      where: { name: { equals: name.value, mode: 'insensitive' } },
    })

    return row ? PrismaTeamMapper.toDomain(row) : null
  }

  async list(criteria: ListTeamsCriteria): Promise<PaginatedResult<Team>> {
    const where = PrismaTeamRepository.buildWhere(criteria)

    // Uma transacao para que total e pagina sejam consistentes entre si.
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        orderBy: { [criteria.sort.field]: criteria.sort.direction },
        take: criteria.limit,
        skip: criteria.offset,
      }),
      this.prisma.team.count({ where }),
    ])

    return { items: rows.map(PrismaTeamMapper.toDomain), total }
  }

  async create(team: Team): Promise<void> {
    await this.prisma.team.create({ data: PrismaTeamMapper.toPersistence(team) })
  }

  async update(team: Team): Promise<void> {
    const { id, ...data } = PrismaTeamMapper.toPersistence(team)

    await this.prisma.team.update({ where: { id }, data })
  }

  async delete(id: UniqueEntityId): Promise<void> {
    // Os vinculos em task_teams caem por onDelete: Cascade; as tarefas ficam.
    await this.prisma.team.delete({ where: { id: id.value } })
  }

  private static buildWhere(
    criteria: ListTeamsCriteria,
  ): Prisma.TeamWhereInput {
    if (!criteria.search) return {}

    return {
      OR: [
        { name: { contains: criteria.search, mode: 'insensitive' } },
        { description: { contains: criteria.search, mode: 'insensitive' } },
      ],
    }
  }
}
