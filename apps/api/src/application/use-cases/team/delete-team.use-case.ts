import { UniqueEntityId } from '../../../domain/shared/unique-entity-id'
import { TeamNotFoundError } from '../../../domain/team/errors/team-errors'
import type { DeleteTeamInput } from '../../dtos/team.dto'
import type { DeleteTeamUseCase } from '../../ports/in/team-use-cases.port'
import type { Logger } from '../../ports/out/logger.port'
import type { TeamRepository } from '../../ports/out/team-repository.port'

export class DeleteTeam implements DeleteTeamUseCase {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly logger: Logger,
  ) {}

  /**
   * Apagar um time remove apenas os VINCULOS com as tarefas (cascade em
   * task_teams). As tarefas continuam existindo, possivelmente sem nenhum time,
   * o que o dominio permite: uma tarefa pertence a zero ou mais times.
   */
  async execute(input: DeleteTeamInput): Promise<void> {
    const teamId = UniqueEntityId.create(input.teamId)

    const team = await this.teamRepository.findById(teamId)
    if (!team) {
      throw new TeamNotFoundError(teamId.value)
    }

    await this.teamRepository.delete(teamId)

    this.logger.info('Time removido', {
      teamId: teamId.value,
      teamName: team.name.value,
    })
  }
}
