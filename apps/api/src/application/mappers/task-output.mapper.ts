import type { Task } from '../../domain/task/task.entity'
import type { Team } from '../../domain/team/team.entity'
import type { TaskOutput } from '../dtos/task.dto'
import type { TeamSummaryOutput } from '../dtos/team.dto'
import { TeamOutputMapper } from './team-output.mapper'

export const TaskOutputMapper = {
  /**
   * @param teamsById times ja carregados em lote pelo use case. Recebe-los
   *   prontos (em vez de buscar aqui) e o que evita N+1 na listagem.
   */
  toOutput(
    task: Task,
    teamsById: ReadonlyMap<string, Team>,
    now: Date,
  ): TaskOutput {
    const teams = task.teamIds.reduce<TeamSummaryOutput[]>((acc, teamId) => {
      const team = teamsById.get(teamId.value)
      if (team) acc.push(TeamOutputMapper.toSummary(team))
      return acc
    }, [])

    return {
      id: task.id.value,
      title: task.title.value,
      description: task.description,
      status: task.status.value,
      dueDate: task.dueDate,
      teams,
      isOverdue: task.isOverdue(now),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }
  },
} as const
