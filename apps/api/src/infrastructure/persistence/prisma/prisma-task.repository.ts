import type { Prisma } from '@prisma/client'
import type { PaginatedResult } from '../../../application/dtos/pagination.dto'
import type {
  ListTasksCriteria,
  TaskRepository,
} from '../../../application/ports/out/task-repository.port'
import type { Task } from '../../../domain/task/task.entity'
import type { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import { PrismaTaskMapper } from './mappers/prisma-task.mapper'
import type { PrismaClient } from './prisma-client'

/** Sempre carregamos os ids dos times: a entidade Task nao existe sem eles. */
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

    // groupBy resolve a contagem de TODOS os times em uma consulta.
    const rows = await this.prisma.taskTeam.groupBy({
      by: ['teamId'],
      where: { teamId: { in: teamIds.map((id) => id.value) } },
      _count: { taskId: true },
    })

    return new Map(rows.map((row) => [row.teamId, row._count.taskId]))
  }

  async create(task: Task): Promise<void> {
    const data = PrismaTaskMapper.toPersistence(task)

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
  }

  /**
   * Atualiza a tarefa e RECONCILIA os vinculos de time numa unica transacao.
   *
   * O diff (em vez de apagar tudo e recriar) preserva assigned_at dos vinculos
   * que continuam existindo, que e justamente o motivo da tabela de juncao ser
   * explicita.
   */
  async update(task: Task): Promise<void> {
    const { id, ...data } = PrismaTaskMapper.toPersistence(task)
    const nextTeamIds = task.teamIds.map((teamId) => teamId.value)

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({ where: { id }, data })

      // `notIn: []` no Prisma nao filtra nada, entao o caso vazio e explicito.
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
  }

  async delete(id: UniqueEntityId): Promise<void> {
    await this.prisma.task.delete({ where: { id: id.value } })
  }

  private static buildWhere(
    criteria: ListTasksCriteria,
  ): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {}

    if (criteria.status) {
      where.status = criteria.status.value
    }

    // Filtro por time atravessa a tabela de juncao.
    if (criteria.teamId) {
      where.teams = { some: { teamId: criteria.teamId.value } }
    }

    if (criteria.search) {
      where.OR = [
        { title: { contains: criteria.search, mode: 'insensitive' } },
        { description: { contains: criteria.search, mode: 'insensitive' } },
      ]
    }

    return where
  }

  private static buildOrderBy(
    criteria: ListTasksCriteria,
  ): Prisma.TaskOrderByWithRelationInput[] {
    const { field, direction } = criteria.sort

    return [
      // Datas nulas por ultimo: uma tarefa sem prazo nao deve aparecer antes
      // das que tem prazo definido ao ordenar por dueDate.
      field === 'dueDate'
        ? { dueDate: { sort: direction, nulls: 'last' } }
        : { [field]: direction },
      // Desempate estavel: sem isso a paginacao pode repetir ou perder itens
      // quando varias linhas tem o mesmo valor no campo ordenado.
      { id: 'asc' },
    ]
  }
}
