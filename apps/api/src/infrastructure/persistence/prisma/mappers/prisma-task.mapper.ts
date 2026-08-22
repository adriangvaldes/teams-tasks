import type { Task as PrismaTask, TaskTeam } from '@prisma/client'
import { UniqueEntityId } from '../../../../domain/shared/unique-entity-id'
import { Task } from '../../../../domain/task/task.entity'
import { TaskStatus } from '../../../../domain/task/value-objects/task-status.vo'
import { TaskTitle } from '../../../../domain/task/value-objects/task-title.vo'

export type PrismaTaskWithTeams = PrismaTask & {
  teams: Pick<TaskTeam, 'teamId'>[]
}

export const PrismaTaskMapper = {
  toDomain(row: PrismaTaskWithTeams): Task {
    return Task.reconstitute(
      {
        title: TaskTitle.create(row.title),
        description: row.description,
        status: TaskStatus.create(row.status),
        dueDate: row.dueDate,
        teamIds: row.teams.map((link) => UniqueEntityId.create(link.teamId)),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      UniqueEntityId.create(row.id),
    )
  },

  toPersistence(task: Task): PrismaTask {
    return {
      id: task.id.value,
      title: task.title.value,
      description: task.description,
      status: task.status.value,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }
  },
} as const
