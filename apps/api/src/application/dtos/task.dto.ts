import type { TaskStatusValue } from '../../domain/task/value-objects/task-status.vo'
import type { TaskSortField } from '../ports/out/task-repository.port'
import type { SortCriteria } from './pagination.dto'
import type { TeamSummaryOutput } from './team.dto'

export interface TaskOutput {
  id: string
  title: string
  description: string | null
  status: TaskStatusValue
  dueDate: Date | null

  teams: TeamSummaryOutput[]

  isOverdue: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateTaskInput {
  title: string
  description?: string | null | undefined
  status?: string | undefined
  dueDate?: string | null | undefined
  teamIds?: string[] | undefined
}

export interface UpdateTaskInput {
  taskId: string
  title?: string | undefined
  description?: string | null | undefined
  status?: string | undefined
  dueDate?: string | null | undefined
  teamIds?: string[] | undefined
}

export interface ChangeTaskStatusInput {
  taskId: string
  status: string
}

export interface GetTaskInput {
  taskId: string
}

export interface DeleteTaskInput {
  taskId: string
}

export interface ListTasksInput {
  teamId?: string | undefined
  status?: string | undefined
  search?: string | undefined
  limit: number
  offset: number
  sort: SortCriteria<TaskSortField>
}
