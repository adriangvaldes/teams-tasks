import type { PaginatedOutput } from '../../dtos/pagination.dto'
import type { ListTeamsInput, TeamOutput } from '../../dtos/team.dto'
import { TeamOutputMapper } from '../../mappers/team-output.mapper'
import type { ListTeamsUseCase } from '../../ports/in/team-use-cases.port'
import type { TaskRepository } from '../../ports/out/task-repository.port'
import type { TeamRepository } from '../../ports/out/team-repository.port'

export class ListTeams implements ListTeamsUseCase {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly taskRepository: TaskRepository,
  ) {}

  async execute(input: ListTeamsInput): Promise<PaginatedOutput<TeamOutput>> {
    const { items, total } = await this.teamRepository.list({
      search: input.search,
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
    })

    const counts = await this.taskRepository.countByTeamIds(
      items.map((team) => team.id),
    )

    return {
      items: items.map((team) =>
        TeamOutputMapper.toOutput(team, counts.get(team.id.value) ?? 0),
      ),
      total,
      limit: input.limit,
      offset: input.offset,
    }
  }
}
