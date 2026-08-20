import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ListTeams } from '../../../src/application/use-cases/team/list-teams.use-case'
import { UniqueEntityId } from '../../../src/domain/shared/unique-entity-id'
import { Task } from '../../../src/domain/task/task.entity'
import { Team } from '../../../src/domain/team/team.entity'
import { InMemoryTaskRepository } from '../../fakes/in-memory-task.repository'
import { InMemoryTeamRepository } from '../../fakes/in-memory-team.repository'
import { SequentialIdGenerator } from '../../fakes/sequential-id-generator'

const TEAM_ALPHA = '11111111-1111-4111-8111-111111111111'
const TEAM_DESIGN = '22222222-2222-4222-8222-222222222222'
const TEAM_INFRA = '33333333-3333-4333-8333-333333333333'
const NOW = new Date('2026-03-10T12:00:00.000Z')

const DEFAULT_QUERY = {
  limit: 20,
  offset: 0,
  sort: { field: 'name', direction: 'asc' },
} as const

describe('ListTeams', () => {
  let teamRepository: InMemoryTeamRepository
  let taskRepository: InMemoryTaskRepository
  let useCase: ListTeams

  beforeEach(async () => {
    teamRepository = new InMemoryTeamRepository()
    taskRepository = new InMemoryTaskRepository()
    useCase = new ListTeams(teamRepository, taskRepository)

    for (const [id, name, colorHex] of [
      [TEAM_ALPHA, 'Squad Alpha', '#2563EB'],
      [TEAM_DESIGN, 'Design System', '#DB2777'],
      [TEAM_INFRA, 'Plataforma', '#059669'],
    ] as const) {
      await teamRepository.create(
        Team.create({ name, colorHex }, UniqueEntityId.create(id), NOW),
      )
    }

    const ids = new SequentialIdGenerator()

    // 2 tarefas no Alpha, 1 no Design, nenhuma na Plataforma.
    for (const teamIds of [[TEAM_ALPHA], [TEAM_ALPHA], [TEAM_DESIGN]]) {
      await taskRepository.create(
        Task.create(
          { title: 'Tarefa de exemplo', teamIds },
          ids.generate(),
          NOW,
        ),
      )
    }
  })

  it('devolve o total de times para o meta da listagem', async () => {
    const result = await useCase.execute({ ...DEFAULT_QUERY })

    expect(result.total).toBe(3)
  })

  it('anexa a contagem de tarefas de cada time', async () => {
    const result = await useCase.execute({ ...DEFAULT_QUERY })

    expect(result.items.map((team) => [team.name, team.taskCount])).toEqual([
      ['Design System', 1],
      ['Plataforma', 0],
      ['Squad Alpha', 2],
    ])
  })

  it('conta as tarefas de TODOS os times em uma consulta, sem N+1', async () => {
    const spy = vi.spyOn(taskRepository, 'countByTeamIds')

    await useCase.execute({ ...DEFAULT_QUERY })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]?.[0]).toHaveLength(3)
  })

  it('ordena por nome de forma decrescente', async () => {
    const result = await useCase.execute({
      ...DEFAULT_QUERY,
      sort: { field: 'name', direction: 'desc' },
    })

    expect(result.items[0]?.name).toBe('Squad Alpha')
  })

  it('filtra pela busca textual', async () => {
    const result = await useCase.execute({ ...DEFAULT_QUERY, search: 'squad' })

    expect(result.total).toBe(1)
    expect(result.items[0]?.name).toBe('Squad Alpha')
  })

  it('pagina mantendo o total sem paginacao', async () => {
    const result = await useCase.execute({ ...DEFAULT_QUERY, limit: 2 })

    expect(result.items).toHaveLength(2)
    expect(result.total).toBe(3)
  })
})
