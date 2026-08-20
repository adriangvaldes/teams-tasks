import type { TaskDTO } from '@teams-tasks/shared'
import type { TaskOutput } from '../../../application/dtos/task.dto'
import { TeamPresenter } from './team.presenter'

export const TaskPresenter = {
  toDTO(output: TaskOutput): TaskDTO {
    return {
      id: output.id,
      title: output.title,
      description: output.description,
      status: output.status,
      dueDate: output.dueDate ? output.dueDate.toISOString() : null,
      teams: output.teams.map(TeamPresenter.toSummaryDTO),
      isOverdue: output.isOverdue,
      createdAt: output.createdAt.toISOString(),
      updatedAt: output.updatedAt.toISOString(),
    }
  },
} as const
