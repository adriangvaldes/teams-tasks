import {
  buildPaginationMeta,
  changeTaskStatusBodySchema,
  createTaskBodySchema,
  listTasksQuerySchema,
  parseSort,
  updateTaskBodySchema,
} from '@teams-tasks/shared'
import type { RequestHandler } from 'express'
import type {
  ChangeTaskStatusUseCase,
  CreateTaskUseCase,
  DeleteTaskUseCase,
  GetTaskUseCase,
  ListTasksUseCase,
  UpdateTaskUseCase,
} from '../../../application/ports/in/task-use-cases.port'
import type { TaskSortField } from '../../../application/ports/out/task-repository.port'
import { createHandler } from '../create-handler'
import { TaskPresenter } from '../presenters/task.presenter'
import { idParamsSchema } from '../schemas/id-params.schema'

export class TaskController {
  constructor(
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly updateTaskUseCase: UpdateTaskUseCase,
    private readonly changeTaskStatusUseCase: ChangeTaskStatusUseCase,
    private readonly getTaskUseCase: GetTaskUseCase,
    private readonly deleteTaskUseCase: DeleteTaskUseCase,
    private readonly listTasksUseCase: ListTasksUseCase,
  ) {}

  readonly list: RequestHandler = createHandler(
    { query: listTasksQuerySchema },
    async ({ query }) => {
      const result = await this.listTasksUseCase.execute({
        teamId: query.teamId,
        status: query.status,
        search: query.search,
        limit: query.limit,
        offset: query.offset,
        sort: parseSort<TaskSortField>(query.sort),
      })

      return {
        status: 200,
        body: {
          data: result.items.map(TaskPresenter.toDTO),
          meta: buildPaginationMeta(result.total, query),
        },
      }
    },
  )

  readonly getById: RequestHandler = createHandler(
    { params: idParamsSchema },
    async ({ params }) => {
      const task = await this.getTaskUseCase.execute({ taskId: params.id })

      return { status: 200, body: { data: TaskPresenter.toDTO(task) } }
    },
  )

  readonly create: RequestHandler = createHandler(
    { body: createTaskBodySchema },
    async ({ body }) => {
      const task = await this.createTaskUseCase.execute({
        title: body.title,
        description: body.description,
        status: body.status,
        dueDate: body.dueDate,
        teamIds: body.teamIds,
      })

      return { status: 201, body: { data: TaskPresenter.toDTO(task) } }
    },
  )

  readonly update: RequestHandler = createHandler(
    { params: idParamsSchema, body: updateTaskBodySchema },
    async ({ params, body }) => {
      const task = await this.updateTaskUseCase.execute({
        taskId: params.id,
        ...body,
      })

      return { status: 200, body: { data: TaskPresenter.toDTO(task) } }
    },
  )

  readonly changeStatus: RequestHandler = createHandler(
    { params: idParamsSchema, body: changeTaskStatusBodySchema },
    async ({ params, body }) => {
      const task = await this.changeTaskStatusUseCase.execute({
        taskId: params.id,
        status: body.status,
      })

      return { status: 200, body: { data: TaskPresenter.toDTO(task) } }
    },
  )

  readonly remove: RequestHandler = createHandler(
    { params: idParamsSchema },
    async ({ params }) => {
      await this.deleteTaskUseCase.execute({ taskId: params.id })

      return { status: 204 }
    },
  )
}
