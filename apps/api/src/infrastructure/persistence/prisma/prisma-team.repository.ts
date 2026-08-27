import type { Prisma } from '@prisma/client'
import type { PaginatedResult } from '../../../application/dtos/pagination.dto'
import type {
  ListTeamsCriteria,
  TeamRepository,
} from '../../../application/ports/out/team-repository.port'
import type { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import {
  TeamNameAlreadyInUseError,
  TeamNotFoundError,
} from '../../../domain/team/errors/team-errors'
import type { Team } from '../../../domain/team/team.entity'
import type { TeamName } from '../../../domain/team/value-objects/team-name.vo'
import { PrismaTeamMapper } from './mappers/prisma-team.mapper'
import type { PrismaClient } from './prisma-client'
import { isPrismaError, PRISMA_ERROR, violatedFields } from './prisma-errors'
import { escapeLikePattern } from './prisma-search'

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
    const row = await this.prisma.team.findFirst({
      where: { name: { equals: name.value, mode: 'insensitive' } },
    })

    return row ? PrismaTeamMapper.toDomain(row) : null
  }

  async list(criteria: ListTeamsCriteria): Promise<PaginatedResult<Team>> {
    const where = PrismaTeamRepository.buildWhere(criteria)

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
    try {
      await this.prisma.team.create({
        data: PrismaTeamMapper.toPersistence(team),
      })
    } catch (error) {
      throw PrismaTeamRepository.translate(error, team)
    }
  }

  async update(team: Team): Promise<void> {
    const { id, ...data } = PrismaTeamMapper.toPersistence(team)

    try {
      await this.prisma.team.update({ where: { id }, data })
    } catch (error) {
      throw PrismaTeamRepository.translate(error, team)
    }
  }

  async delete(id: UniqueEntityId): Promise<void> {
    try {
      await this.prisma.team.delete({ where: { id: id.value } })
    } catch (error) {
      if (isPrismaError(error, PRISMA_ERROR.RECORD_NOT_FOUND)) {
        throw new TeamNotFoundError(id.value)
      }
      throw error
    }
  }

  /**
   * A verificacao de nome duplicado feita no caso de uso resolve o caso comum,
   * mas nao elimina a corrida entre duas requisicoes simultaneas. Sem esta
   * traducao, esse encontro viraria 500 em vez do 409 que o cliente espera.
   */
  private static translate(error: unknown, team: Team): unknown {
    if (isPrismaError(error, PRISMA_ERROR.UNIQUE_VIOLATION)) {
      if (violatedFields(error).some((field) => field.includes('name'))) {
        return new TeamNameAlreadyInUseError(team.name.value)
      }
    }

    if (isPrismaError(error, PRISMA_ERROR.RECORD_NOT_FOUND)) {
      return new TeamNotFoundError(team.id.value)
    }

    return error
  }

  private static buildWhere(
    criteria: ListTeamsCriteria,
  ): Prisma.TeamWhereInput {
    if (!criteria.search) return {}

    const term = escapeLikePattern(criteria.search)

    return {
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ],
    }
  }
}
