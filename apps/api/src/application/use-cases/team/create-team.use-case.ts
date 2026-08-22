import { TeamNameAlreadyInUseError } from '../../../domain/team/errors/team-errors'
import { Team } from '../../../domain/team/team.entity'
import { TeamName } from '../../../domain/team/value-objects/team-name.vo'
import type { CreateTeamInput, TeamOutput } from '../../dtos/team.dto'
import { TeamOutputMapper } from '../../mappers/team-output.mapper'
import type { CreateTeamUseCase } from '../../ports/in/team-use-cases.port'
import type { Clock } from '../../ports/out/clock.port'
import type { IdGenerator } from '../../ports/out/id-generator.port'
import type { TeamRepository } from '../../ports/out/team-repository.port'

export class CreateTeam implements CreateTeamUseCase {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateTeamInput): Promise<TeamOutput> {
    const name = TeamName.create(input.name)

    const existing = await this.teamRepository.findByName(name)
    if (existing) {
      throw new TeamNameAlreadyInUseError(name.value)
    }

    const team = Team.create(
      {
        name: name.value,
        colorHex: input.colorHex,
        description: input.description ?? null,
      },
      this.idGenerator.generate(),
      this.clock.now(),
    )

    await this.teamRepository.create(team)

    return TeamOutputMapper.toOutput(team, 0)
  }
}
