import { TaskNotFoundError } from '../../../domain/task/errors/task-errors'
import { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import type { DeleteTaskInput } from '../../dtos/task.dto'
import type { DeleteTaskUseCase } from '../../ports/in/task-use-cases.port'
import type { Logger } from '../../ports/out/logger.port'
import type { TaskRepository } from '../../ports/out/task-repository.port'

export class DeleteTask implements DeleteTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly logger: Logger,
  ) {}

  async execute(input: DeleteTaskInput): Promise<void> {
    const taskId = UniqueEntityId.create(input.taskId)

    const task = await this.taskRepository.findById(taskId)
    if (!task) {
      throw new TaskNotFoundError(taskId.value)
    }

    await this.taskRepository.delete(taskId)

    this.logger.info('Tarefa removida', {
      taskId: taskId.value,
      title: task.title.value,
    })
  }
}
