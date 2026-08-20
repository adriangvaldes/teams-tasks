import type { PaginatedOutput } from '../../dtos/pagination.dto'
import type {
  ChangeTaskStatusInput,
  CreateTaskInput,
  DeleteTaskInput,
  GetTaskInput,
  ListTasksInput,
  TaskOutput,
  UpdateTaskInput,
} from '../../dtos/task.dto'
import type { UseCase } from './use-case.port'

export type CreateTaskUseCase = UseCase<CreateTaskInput, TaskOutput>
export type UpdateTaskUseCase = UseCase<UpdateTaskInput, TaskOutput>
export type ChangeTaskStatusUseCase = UseCase<ChangeTaskStatusInput, TaskOutput>
export type GetTaskUseCase = UseCase<GetTaskInput, TaskOutput>
export type DeleteTaskUseCase = UseCase<DeleteTaskInput, void>
export type ListTasksUseCase = UseCase<
  ListTasksInput,
  PaginatedOutput<TaskOutput>
>
