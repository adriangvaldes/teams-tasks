import { UniqueEntityId } from '../../domain/shared/unique-entity-id'
import { TeamsNotFoundError } from '../../domain/team/errors/team-errors'
import type { Team } from '../../domain/team/team.entity'
import type { TeamRepository } from '../ports/out/team-repository.port'

export class TeamLoader {
  constructor(private readonly teamRepository: TeamRepository) {}

  async loadByIds(
    teamIds: readonly UniqueEntityId[],
  ): Promise<Map<string, Team>> {
    if (teamIds.length === 0) return new Map()

    const unique = [...new Map(teamIds.map((id) => [id.value, id])).values()]

    const teams = await this.teamRepository.findManyByIds(unique)

    return new Map(teams.map((team) => [team.id.value, team]))
  }

  async requireAllExist(teamIds: readonly string[]): Promise<void> {
    if (teamIds.length === 0) return

    const ids = teamIds.map((teamId) => UniqueEntityId.create(teamId))
    const found = await this.loadByIds(ids)

    const missing = ids
      .filter((id) => !found.has(id.value))
      .map((id) => id.value)

    if (missing.length > 0) {
      throw new TeamsNotFoundError([...new Set(missing)])
    }
  }
}
