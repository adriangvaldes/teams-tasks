import { TaskStatus } from '../../../domain/task/value-objects/task-status.vo'
import { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
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
    // Strings de query viram tipos de dominio AQUI. A partir deste ponto o
    // repositorio recebe apenas valores ja validados.
    const { items, total } = await this.taskRepository.list({
      teamId: input.teamId ? UniqueEntityId.create(input.teamId) : undefined,
      status: input.status ? TaskStatus.create(input.status) : undefined,
      search: input.search,
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
    })

    // Uniao dos times de TODAS as tarefas da pagina, resolvida numa consulta.
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
