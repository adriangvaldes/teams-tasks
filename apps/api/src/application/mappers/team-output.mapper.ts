import type { Team } from '../../domain/team/team.entity'
import type { TeamOutput, TeamSummaryOutput } from '../dtos/team.dto'

export const TeamOutputMapper = {
  toOutput(team: Team, taskCount: number): TeamOutput {
    return {
      id: team.id.value,
      name: team.name.value,
      colorHex: team.colorHex.value,
      description: team.description,
      taskCount,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    }
  },

  toSummary(team: Team): TeamSummaryOutput {
    return {
      id: team.id.value,
      name: team.name.value,
      colorHex: team.colorHex.value,
    }
  },
} as const
