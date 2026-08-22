import { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import {
  TeamNameAlreadyInUseError,
  TeamNotFoundError,
} from '../../../domain/team/errors/team-errors'
import { TeamName } from '../../../domain/team/value-objects/team-name.vo'
import type { TeamOutput, UpdateTeamInput } from '../../dtos/team.dto'
import { TeamOutputMapper } from '../../mappers/team-output.mapper'
import type { UpdateTeamUseCase } from '../../ports/in/team-use-cases.port'
import type { Clock } from '../../ports/out/clock.port'
import type { TaskRepository } from '../../ports/out/task-repository.port'
import type { TeamRepository } from '../../ports/out/team-repository.port'

export class UpdateTeam implements UpdateTeamUseCase {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly taskRepository: TaskRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateTeamInput): Promise<TeamOutput> {
    const teamId = UniqueEntityId.create(input.teamId)

    const team = await this.teamRepository.findById(teamId)
    if (!team) {
      throw new TeamNotFoundError(teamId.value)
    }

    const now = this.clock.now()

    if (input.name !== undefined) {
      const nextName = TeamName.create(input.name)

      if (!nextName.equals(team.name)) {
        const conflicting = await this.teamRepository.findByName(nextName)
        if (conflicting) {
          throw new TeamNameAlreadyInUseError(nextName.value)
        }
      }

      team.rename(nextName.value, now)
    }

    if (input.colorHex !== undefined) {
      team.changeColor(input.colorHex, now)
    }

    if (input.description !== undefined) {
      team.changeDescription(input.description, now)
    }

    await this.teamRepository.update(team)

    const counts = await this.taskRepository.countByTeamIds([teamId])

    return TeamOutputMapper.toOutput(team, counts.get(teamId.value) ?? 0)
  }
}
