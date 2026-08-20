import { beforeEach, describe, expect, it } from 'vitest'
import { TeamLoader } from '../../../src/application/services/team-loader.service'
import { CreateTask } from '../../../src/application/use-cases/task/create-task.use-case'
import { UniqueEntityId } from '../../../src/domain/shared/unique-entity-id'
import { InvalidTaskTitleError } from '../../../src/domain/task/errors/task-errors'
import { TeamsNotFoundError } from '../../../src/domain/team/errors/team-errors'
import { Team } from '../../../src/domain/team/team.entity'
import { FixedClock } from '../../fakes/fixed-clock'
import { InMemoryTaskRepository } from '../../fakes/in-memory-task.repository'
import { InMemoryTeamRepository } from '../../fakes/in-memory-team.repository'
import { SequentialIdGenerator } from '../../fakes/sequential-id-generator'

const TEAM_ALPHA = '11111111-1111-4111-8111-111111111111'
const TEAM_DESIGN = '22222222-2222-4222-8222-222222222222'
const TEAM_INEXISTENTE = '99999999-9999-4999-8999-999999999999'
const NOW = new Date('2026-03-10T12:00:00.000Z')

describe('CreateTask', () => {
  let taskRepository: InMemoryTaskRepository
  let teamRepository: InMemoryTeamRepository
  let useCase: CreateTask

  beforeEach(async () => {
    taskRepository = new InMemoryTaskRepository()
    teamRepository = new InMemoryTeamRepository()

    await teamRepository.create(
      Team.create(
        { name: 'Squad Alpha', colorHex: '#2563EB' },
        UniqueEntityId.create(TEAM_ALPHA),
        NOW,
      ),
    )
    await teamRepository.create(
      Team.create(
        { name: 'Design System', colorHex: '#DB2777' },
        UniqueEntityId.create(TEAM_DESIGN),
        NOW,
      ),
    )

    useCase = new CreateTask(
      taskRepository,
      new TeamLoader(teamRepository),
      new SequentialIdGenerator(),
      new FixedClock(NOW),
    )
  })

  it('cria tarefa sem nenhum time', async () => {
    const output = await useCase.execute({ title: 'Preparar backlog' })

    expect(output.teams).toEqual([])
    expect(output.status).toBe('PENDING')
    expect(taskRepository.items).toHaveLength(1)
  })

  it('embute o resumo dos times na saida, para o chip de cor da UI', async () => {
    const output = await useCase.execute({
      title: 'Criar componente de chip',
      teamIds: [TEAM_ALPHA, TEAM_DESIGN],
    })

    expect(output.teams).toEqual([
      { id: TEAM_ALPHA, name: 'Squad Alpha', colorHex: '#2563EB' },
      { id: TEAM_DESIGN, name: 'Design System', colorHex: '#DB2777' },
    ])
  })

  it('rejeita time inexistente com erro NOT_FOUND listando os ids', async () => {
    const promise = useCase.execute({
      title: 'Tarefa orfa',
      teamIds: [TEAM_ALPHA, TEAM_INEXISTENTE],
    })

    await expect(promise).rejects.toThrow(TeamsNotFoundError)
    await expect(promise).rejects.toThrow(TEAM_INEXISTENTE)

    // Integridade referencial e checada ANTES de persistir.
    expect(taskRepository.items).toHaveLength(0)
  })

  it('nao persiste nada quando o titulo viola a invariante', async () => {
    await expect(useCase.execute({ title: 'ab' })).rejects.toThrow(
      InvalidTaskTitleError,
    )

    expect(taskRepository.items).toHaveLength(0)
  })

  it('marca isOverdue quando o prazo informado ja passou', async () => {
    const output = await useCase.execute({
      title: 'Revisar indices',
      dueDate: '2026-03-09T18:00:00.000Z',
    })

    expect(output.isOverdue).toBe(true)
  })
})
