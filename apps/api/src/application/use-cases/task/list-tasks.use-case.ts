import { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import { TaskStatus } from '../../../domain/task/value-objects/task-status.vo'
import type { PaginatedOutput } from '../../dtos/pagination.dto'
import type { ListTasksInput, TaskOutput } from '../../dtos/task.dto'
import { TaskOutputMapper } from '../../mappers/task-output.mapper'
import type { ListTasksUseCase } from '../../ports/in/task-use-cases.port'
import type { Clock } from '../../ports/out/clock.port'
import type { TaskRepository } from '../../ports/out/task-repository.port'
import type { TeamLoader } from '../../services/team-loader.service'

export class ListTasks implements ListTasksUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly teamLoader: TeamLoader,
    private readonly clock: Clock,
  ) {}

  async execute(input: ListTasksInput): Promise<PaginatedOutput<TaskOutput>> {
    const { items, total } = await this.taskRepository.list({
      teamIds: input.teamIds?.map((id) => UniqueEntityId.create(id)),
      statuses: input.statuses?.map((status) => TaskStatus.create(status)),
      search: input.search,
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
    })

    const teams = await this.teamLoader.loadByIds(
      items.flatMap((task) => [...task.teamIds]),
    )

    const now = this.clock.now()

    return {
      items: items.map((task) => TaskOutputMapper.toOutput(task, teams, now)),
      total,
      limit: input.limit,
      offset: input.offset,
    }
  }
}
