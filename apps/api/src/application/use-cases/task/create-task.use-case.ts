import { Task } from '../../../domain/task/task.entity'
import type { CreateTaskInput, TaskOutput } from '../../dtos/task.dto'
import { TaskOutputMapper } from '../../mappers/task-output.mapper'
import type { CreateTaskUseCase } from '../../ports/in/task-use-cases.port'
import type { Clock } from '../../ports/out/clock.port'
import type { IdGenerator } from '../../ports/out/id-generator.port'
import type { TaskRepository } from '../../ports/out/task-repository.port'
import type { TeamLoader } from '../../services/team-loader.service'

export class CreateTask implements CreateTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly teamLoader: TeamLoader,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateTaskInput): Promise<TaskOutput> {
    const teamIds = input.teamIds ?? []

    // Integridade referencial checada na aplicacao para produzir um erro de
    // dominio legivel (404 com a lista de ids), e nao um erro cru de FK.
    await this.teamLoader.requireAllExist(teamIds)

    const now = this.clock.now()

    const task = Task.create(
      {
        title: input.title,
        description: input.description ?? null,
        status: input.status,
        dueDate: input.dueDate ?? null,
        teamIds,
      },
      this.idGenerator.generate(),
      now,
    )

    await this.taskRepository.create(task)

    const teams = await this.teamLoader.loadByIds(task.teamIds)

    return TaskOutputMapper.toOutput(task, teams, now)
  }
}
