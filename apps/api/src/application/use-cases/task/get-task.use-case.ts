import { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import { TaskNotFoundError } from '../../../domain/task/errors/task-errors'
import type { GetTaskInput, TaskOutput } from '../../dtos/task.dto'
import { TaskOutputMapper } from '../../mappers/task-output.mapper'
import type { GetTaskUseCase } from '../../ports/in/task-use-cases.port'
import type { Clock } from '../../ports/out/clock.port'
import type { TaskRepository } from '../../ports/out/task-repository.port'
import type { TeamLoader } from '../../services/team-loader.service'

export class GetTask implements GetTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly teamLoader: TeamLoader,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetTaskInput): Promise<TaskOutput> {
    const taskId = UniqueEntityId.create(input.taskId)

    const task = await this.taskRepository.findById(taskId)
    if (!task) {
      throw new TaskNotFoundError(taskId.value)
    }

    const teams = await this.teamLoader.loadByIds(task.teamIds)

    return TaskOutputMapper.toOutput(task, teams, this.clock.now())
  }
}
