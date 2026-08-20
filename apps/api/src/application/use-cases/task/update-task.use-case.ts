import { TaskNotFoundError } from '../../../domain/task/errors/task-errors'
import { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import type { TaskOutput, UpdateTaskInput } from '../../dtos/task.dto'
import { TaskOutputMapper } from '../../mappers/task-output.mapper'
import type { UpdateTaskUseCase } from '../../ports/in/task-use-cases.port'
import type { Clock } from '../../ports/out/clock.port'
import type { TaskRepository } from '../../ports/out/task-repository.port'
import type { TeamLoader } from '../../services/team-loader.service'

export class UpdateTask implements UpdateTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly teamLoader: TeamLoader,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateTaskInput): Promise<TaskOutput> {
    const taskId = UniqueEntityId.create(input.taskId)

    const task = await this.taskRepository.findById(taskId)
    if (!task) {
      throw new TaskNotFoundError(taskId.value)
    }

    if (input.teamIds !== undefined) {
      await this.teamLoader.requireAllExist(input.teamIds)
    }

    const now = this.clock.now()

    if (input.title !== undefined) {
      task.changeTitle(input.title, now)
    }

    // undefined = campo ausente (nao mexe); null = limpar explicitamente.
    if (input.description !== undefined) {
      task.changeDescription(input.description, now)
    }

    if (input.status !== undefined) {
      task.changeStatus(input.status, now)
    }

    if (input.dueDate !== undefined) {
      task.changeDueDate(input.dueDate, now)
    }

    // Semantica de PUT: o array recebido SUBSTITUI o conjunto de times.
    if (input.teamIds !== undefined) {
      task.assignTeams(input.teamIds, now)
    }

    await this.taskRepository.update(task)

    const teams = await this.teamLoader.loadByIds(task.teamIds)

    return TaskOutputMapper.toOutput(task, teams, now)
  }
}
