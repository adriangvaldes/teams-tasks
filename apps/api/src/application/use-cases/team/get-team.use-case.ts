import { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import { TeamNotFoundError } from '../../../domain/team/errors/team-errors'
import type { GetTeamInput, TeamOutput } from '../../dtos/team.dto'
import { TeamOutputMapper } from '../../mappers/team-output.mapper'
import type { GetTeamUseCase } from '../../ports/in/team-use-cases.port'
import type { TaskRepository } from '../../ports/out/task-repository.port'
import type { TeamRepository } from '../../ports/out/team-repository.port'

export class GetTeam implements GetTeamUseCase {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly taskRepository: TaskRepository,
  ) {}

  async execute(input: GetTeamInput): Promise<TeamOutput> {
    const teamId = UniqueEntityId.create(input.teamId)

    const team = await this.teamRepository.findById(teamId)
    if (!team) {
      throw new TeamNotFoundError(teamId.value)
    }

    const counts = await this.taskRepository.countByTeamIds([teamId])

    return TeamOutputMapper.toOutput(team, counts.get(teamId.value) ?? 0)
  }
}
