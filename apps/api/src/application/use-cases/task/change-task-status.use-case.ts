import { TaskNotFoundError } from '../../../domain/task/errors/task-errors'
import { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import type { ChangeTaskStatusInput, TaskOutput } from '../../dtos/task.dto'
import { TaskOutputMapper } from '../../mappers/task-output.mapper'
import type { ChangeTaskStatusUseCase } from '../../ports/in/task-use-cases.port'
import type { Clock } from '../../ports/out/clock.port'
import type { Logger } from '../../ports/out/logger.port'
import type { TaskRepository } from '../../ports/out/task-repository.port'
import type { TeamLoader } from '../../services/team-loader.service'

/**
 * Use case dedicado a acao rapida da UI ("marcar como Concluida").
 *
 * Poderia ser um UpdateTask com um campo, mas ter um use case proprio deixa a
 * intencao explicita, permite otimizacao/log especificos e e o endpoint que o
 * mobile usa para optimistic update.
 */
export class ChangeTaskStatus implements ChangeTaskStatusUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly teamLoader: TeamLoader,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  async execute(input: ChangeTaskStatusInput): Promise<TaskOutput> {
    const taskId = UniqueEntityId.create(input.taskId)

    const task = await this.taskRepository.findById(taskId)
    if (!task) {
      throw new TaskNotFoundError(taskId.value)
    }

    const previousStatus = task.status.value
    const now = this.clock.now()

    task.changeStatus(input.status, now)

    await this.taskRepository.update(task)

    this.logger.info('Status da tarefa alterado', {
      taskId: taskId.value,
      from: previousStatus,
      to: task.status.value,
    })

    const teams = await this.teamLoader.loadByIds(task.teamIds)

    return TaskOutputMapper.toOutput(task, teams, now)
  }
}
