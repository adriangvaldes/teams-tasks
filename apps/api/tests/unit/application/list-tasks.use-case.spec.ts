import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamLoader } from '../../../src/application/services/team-loader.service'
import { ListTasks } from '../../../src/application/use-cases/task/list-tasks.use-case'
import { UniqueEntityId } from '../../../src/domain/shared/unique-entity-id'
import { Task } from '../../../src/domain/task/task.entity'
import { Team } from '../../../src/domain/team/team.entity'
import { FixedClock } from '../../fakes/fixed-clock'
import { InMemoryTaskRepository } from '../../fakes/in-memory-task.repository'
import { InMemoryTeamRepository } from '../../fakes/in-memory-team.repository'
import { SequentialIdGenerator } from '../../fakes/sequential-id-generator'

const TEAM_ALPHA = '11111111-1111-4111-8111-111111111111'
const TEAM_INFRA = '33333333-3333-4333-8333-333333333333'
const NOW = new Date('2026-03-10T12:00:00.000Z')

const DEFAULT_QUERY = {
  limit: 20,
  offset: 0,
  sort: { field: 'createdAt', direction: 'asc' },
} as const

describe('ListTasks', () => {
  let taskRepository: InMemoryTaskRepository
  let teamRepository: InMemoryTeamRepository
  let teamLoader: TeamLoader
  let useCase: ListTasks

  beforeEach(async () => {
    taskRepository = new InMemoryTaskRepository()
    teamRepository = new InMemoryTeamRepository()
    teamLoader = new TeamLoader(teamRepository)
    useCase = new ListTasks(taskRepository, teamLoader, new FixedClock(NOW))

    for (const [id, name, colorHex] of [
      [TEAM_ALPHA, 'Squad Alpha', '#2563EB'],
      [TEAM_INFRA, 'Plataforma', '#059669'],
    ] as const) {
      await teamRepository.create(
        Team.create({ name, colorHex }, UniqueEntityId.create(id), NOW),
      )
    }

    const ids = new SequentialIdGenerator()
    const fixtures = [
      {
        title: 'Implementar listagem',
        status: 'IN_PROGRESS',
        teamIds: [TEAM_ALPHA],
      },
      { title: 'Configurar pipeline', status: 'DONE', teamIds: [TEAM_INFRA] },
      {
        title: 'Revisar indices de busca',
        statuses: ['PENDING'],
        teamIds: [TEAM_INFRA],
      },
      { title: 'Preparar backlog', status: 'PENDING', teamIds: [] },
    ]

    for (const [index, fixture] of fixtures.entries()) {
      await taskRepository.create(
        Task.create(
          fixture,
          ids.generate(),

          new Date(NOW.getTime() + index * 60_000),
        ),
      )
    }
  })

  it('devolve a pagina inteira com o total, para montar o meta', async () => {
    const result = await useCase.execute({ ...DEFAULT_QUERY })

    expect(result.total).toBe(4)
    expect(result.items).toHaveLength(4)
    expect(result.limit).toBe(20)
  })

  it('filtra por time', async () => {
    const result = await useCase.execute({
      ...DEFAULT_QUERY,
      teamIds: [TEAM_INFRA],
    })

    expect(result.total).toBe(2)
    expect(result.items.map((task) => task.title)).toEqual([
      'Configurar pipeline',
      'Revisar indices de busca',
    ])
  })

  it('filtra por status', async () => {
    const result = await useCase.execute({
      ...DEFAULT_QUERY,
      statuses: ['PENDING'],
    })

    expect(result.total).toBe(2)
  })

  it('filtra por varios status ao mesmo tempo', async () => {
    const result = await useCase.execute({
      ...DEFAULT_QUERY,
      statuses: ['PENDING', 'DONE'],
    })

    const apenasPendenteOuConcluida = result.items.every(
      (task) => task.status === 'PENDING' || task.status === 'DONE',
    )

    expect(result.total).toBeGreaterThan(2)
    expect(apenasPendenteOuConcluida).toBe(true)
  })

  it('filtra por varios times ao mesmo tempo', async () => {
    const somenteInfra = await useCase.execute({
      ...DEFAULT_QUERY,
      teamIds: [TEAM_INFRA],
    })

    const infraEAlpha = await useCase.execute({
      ...DEFAULT_QUERY,
      teamIds: [TEAM_INFRA, TEAM_ALPHA],
    })

    expect(infraEAlpha.total).toBeGreaterThan(somenteInfra.total)
  })

  it('combina filtro de time e status', async () => {
    const result = await useCase.execute({
      ...DEFAULT_QUERY,
      teamIds: [TEAM_INFRA],
      statuses: ['PENDING'],
    })

    expect(result.items.map((task) => task.title)).toEqual([
      'Revisar indices de busca',
    ])
  })

  it('busca por texto no titulo, ignorando a caixa', async () => {
    const result = await useCase.execute({
      ...DEFAULT_QUERY,
      search: 'INDICES',
    })

    expect(result.total).toBe(1)
  })

  it('pagina respeitando limit e offset', async () => {
    const result = await useCase.execute({
      ...DEFAULT_QUERY,
      limit: 2,
      offset: 2,
    })

    expect(result.items).toHaveLength(2)

    expect(result.total).toBe(4)
    expect(result.offset).toBe(2)
  })

  it('ordena por titulo de forma decrescente', async () => {
    const result = await useCase.execute({
      ...DEFAULT_QUERY,
      sort: { field: 'title', direction: 'desc' },
    })

    expect(result.items[0]?.title).toBe('Revisar indices de busca')
  })

  it('resolve os times da pagina em UMA consulta, sem N+1', async () => {
    const spy = vi.spyOn(teamRepository, 'findManyByIds')

    const result = await useCase.execute({ ...DEFAULT_QUERY })

    expect(spy).toHaveBeenCalledTimes(1)

    expect(spy.mock.calls[0]?.[0]).toHaveLength(2)
    expect(result.items.filter((task) => task.teams.length > 0)).toHaveLength(3)
  })

  it('devolve tarefa sem time com a lista de times vazia', async () => {
    const result = await useCase.execute({
      ...DEFAULT_QUERY,
      search: 'backlog',
    })

    expect(result.items[0]?.teams).toEqual([])
  })
})
