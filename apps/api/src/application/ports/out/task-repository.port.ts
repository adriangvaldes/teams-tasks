import type { Task } from '../../../domain/task/task.entity'
import type { TaskStatus } from '../../../domain/task/value-objects/task-status.vo'
import type { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import type {
  PaginatedResult,
  PaginationCriteria,
  SortCriteria,
} from '../../dtos/pagination.dto'

export type TaskSortField = 'createdAt' | 'dueDate' | 'title' | 'status'

export interface ListTasksCriteria extends PaginationCriteria {
  teamId?: UniqueEntityId | undefined
  status?: TaskStatus | undefined
  search?: string | undefined
  sort: SortCriteria<TaskSortField>
}

export interface TaskRepository {
  findById(id: UniqueEntityId): Promise<Task | null>
  list(criteria: ListTasksCriteria): Promise<PaginatedResult<Task>>
  /**
   * Contagem agregada por time em UMA consulta. Existe justamente para que
   * a listagem de times nao caia em N+1 ao exibir o total de tarefas.
   */
  countByTeamIds(teamIds: readonly UniqueEntityId[]): Promise<Map<string, number>>
  create(task: Task): Promise<void>
  update(task: Task): Promise<void>
  delete(id: UniqueEntityId): Promise<void>
}
