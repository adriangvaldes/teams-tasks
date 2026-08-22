import type { TeamDTO, TeamSummaryDTO } from '@teams-tasks/shared'
import type {
  TeamOutput,
  TeamSummaryOutput,
} from '../../../application/dtos/team.dto'

export const TeamPresenter = {
  toDTO(output: TeamOutput): TeamDTO {
    return {
      id: output.id,
      name: output.name,
      colorHex: output.colorHex,
      description: output.description,
      taskCount: output.taskCount,
      createdAt: output.createdAt.toISOString(),
      updatedAt: output.updatedAt.toISOString(),
    }
  },

  toSummaryDTO(output: TeamSummaryOutput): TeamSummaryDTO {
    return {
      id: output.id,
      name: output.name,
      colorHex: output.colorHex,
    }
  },
} as const
