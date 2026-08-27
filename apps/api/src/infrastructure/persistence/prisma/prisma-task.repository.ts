import type { Prisma } from '@prisma/client'
import type { PaginatedResult } from '../../../application/dtos/pagination.dto'
import type {
  ListTasksCriteria,
  TaskRepository,
} from '../../../application/ports/out/task-repository.port'
import type { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import { TaskNotFoundError } from '../../../domain/task/errors/task-errors'
import type { Task } from '../../../domain/task/task.entity'
import { TeamsNotFoundError } from '../../../domain/team/errors/team-errors'
import { PrismaTaskMapper } from './mappers/prisma-task.mapper'
import type { PrismaClient } from './prisma-client'
import { isPrismaError, PRISMA_ERROR } from './prisma-errors'
import { escapeLikePattern } from './prisma-search'

const WITH_TEAM_LINKS = { teams: { select: { teamId: true } } } as const

export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: UniqueEntityId): Promise<Task | null> {
    const row = await this.prisma.task.findUnique({
      where: { id: id.value },
      include: WITH_TEAM_LINKS,
    })

    return row ? PrismaTaskMapper.toDomain(row) : null
  }

  async list(criteria: ListTasksCriteria): Promise<PaginatedResult<Task>> {
    const where = PrismaTaskRepository.buildWhere(criteria)

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        include: WITH_TEAM_LINKS,
        orderBy: PrismaTaskRepository.buildOrderBy(criteria),
        take: criteria.limit,
        skip: criteria.offset,
      }),
      this.prisma.task.count({ where }),
    ])

    return { items: rows.map(PrismaTaskMapper.toDomain), total }
  }

  async countByTeamIds(
    teamIds: readonly UniqueEntityId[],
  ): Promise<Map<string, number>> {
    if (teamIds.length === 0) return new Map()

    const rows = await this.prisma.taskTeam.groupBy({
      by: ['teamId'],
      where: { teamId: { in: teamIds.map((id) => id.value) } },
      _count: { taskId: true },
    })

    return new Map(rows.map((row) => [row.teamId, row._count.taskId]))
  }

  async create(task: Task): Promise<void> {
    const data = PrismaTaskMapper.toPersistence(task)

    try {
      await this.prisma.task.create({
        data: {
          ...data,
          teams: {
            create: task.teamIds.map((teamId) => ({
              teamId: teamId.value,
              assignedAt: task.createdAt,
            })),
          },
        },
      })
    } catch (error) {
      throw PrismaTaskRepository.translate(error, task)
    }
  }

  async update(task: Task): Promise<void> {
    const { id, ...data } = PrismaTaskMapper.toPersistence(task)
    const nextTeamIds = task.teamIds.map((teamId) => teamId.value)

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.task.update({ where: { id }, data })

        await tx.taskTeam.deleteMany({
          where:
            nextTeamIds.length === 0
              ? { taskId: id }
              : { taskId: id, teamId: { notIn: nextTeamIds } },
        })

        if (nextTeamIds.length > 0) {
          await tx.taskTeam.createMany({
            data: nextTeamIds.map((teamId) => ({
              taskId: id,
              teamId,
              assignedAt: task.updatedAt,
            })),
            skipDuplicates: true,
          })
        }
      })
    } catch (error) {
      throw PrismaTaskRepository.translate(error, task)
    }
  }

  async delete(id: UniqueEntityId): Promise<void> {
    try {
      await this.prisma.task.delete({ where: { id: id.value } })
    } catch (error) {
      if (isPrismaError(error, PRISMA_ERROR.RECORD_NOT_FOUND)) {
        throw new TaskNotFoundError(id.value)
      }
      throw error
    }
  }

  private static translate(error: unknown, task: Task): unknown {
    if (isPrismaError(error, PRISMA_ERROR.FOREIGN_KEY_VIOLATION)) {
      return new TeamsNotFoundError(task.teamIds.map((teamId) => teamId.value))
    }

    if (isPrismaError(error, PRISMA_ERROR.RECORD_NOT_FOUND)) {
      return new TaskNotFoundError(task.id.value)
    }

    return error
  }

  private static buildWhere(
    criteria: ListTasksCriteria,
  ): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {}

    if (criteria.status) {
      where.status = criteria.status.value
    }

    if (criteria.teamId) {
      where.teams = { some: { teamId: criteria.teamId.value } }
    }

    if (criteria.search) {
      const term = escapeLikePattern(criteria.search)

      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ]
    }

    return where
  }

  private static buildOrderBy(
    criteria: ListTasksCriteria,
  ): Prisma.TaskOrderByWithRelationInput[] {
    const { field, direction } = criteria.sort

    return [
      field === 'dueDate'
        ? { dueDate: { sort: direction, nulls: 'last' } }
        : { [field]: direction },

      { id: 'asc' },
    ]
  }
}
