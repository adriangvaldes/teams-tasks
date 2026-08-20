import { UniqueEntityId } from '../../domain/shared/unique-entity-id'
import { TeamsNotFoundError } from '../../domain/team/errors/team-errors'
import type { Team } from '../../domain/team/team.entity'
import type { TeamRepository } from '../ports/out/team-repository.port'

/**
 * Servico de aplicacao compartilhado pelos use cases de tarefa.
 *
 * Existe por dois motivos concretos:
 *  1. carregar times em LOTE, para que montar a resposta de uma pagina de
 *     tarefas custe uma consulta, e nao uma por tarefa (N+1);
 *  2. concentrar a validacao "todos esses times existem?" em um unico lugar,
 *     em vez de repeti-la em create/update de tarefa.
 *
 * Nao e um repositorio: nao acessa banco diretamente, apenas orquestra a porta.
 */
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

  /** Valida os ids e garante que todos existem, ou lanca TeamsNotFoundError. */
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
