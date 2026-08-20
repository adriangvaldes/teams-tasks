import { beforeEach, describe, expect, it } from 'vitest'
import { TeamLoader } from '../../../src/application/services/team-loader.service'
import { UpdateTask } from '../../../src/application/use-cases/task/update-task.use-case'
import { UniqueEntityId } from '../../../src/domain/shared/unique-entity-id'
import { Task } from '../../../src/domain/task/task.entity'
import { TeamsNotFoundError } from '../../../src/domain/team/errors/team-errors'
import { Team } from '../../../src/domain/team/team.entity'
import { FixedClock } from '../../fakes/fixed-clock'
import { InMemoryTaskRepository } from '../../fakes/in-memory-task.repository'
import { InMemoryTeamRepository } from '../../fakes/in-memory-team.repository'

const TASK_ID = 'a0000001-0000-4000-8000-000000000001'
const TEAM_ALPHA = '11111111-1111-4111-8111-111111111111'
const TEAM_DESIGN = '22222222-2222-4222-8222-222222222222'
const NOW = new Date('2026-03-10T12:00:00.000Z')

describe('UpdateTask', () => {
  let taskRepository: InMemoryTaskRepository
  let teamRepository: InMemoryTeamRepository
  let useCase: UpdateTask

  beforeEach(async () => {
    taskRepository = new InMemoryTaskRepository()
    teamRepository = new InMemoryTeamRepository()

    for (const [id, name, colorHex] of [
      [TEAM_ALPHA, 'Squad Alpha', '#2563EB'],
      [TEAM_DESIGN, 'Design System', '#DB2777'],
    ] as const) {
      await teamRepository.create(
        Team.create({ name, colorHex }, UniqueEntityId.create(id), NOW),
      )
    }

    await taskRepository.create(
      Task.create(
        {
          title: 'Implementar listagem',
          description: 'Descricao original',
          dueDate: '2026-04-01T18:00:00.000Z',
          teamIds: [TEAM_ALPHA],
        },
        UniqueEntityId.create(TASK_ID),
        NOW,
      ),
    )

    useCase = new UpdateTask(
      taskRepository,
      new TeamLoader(teamRepository),
      new FixedClock(NOW),
    )
  })

  describe('semantica de campos parciais', () => {
    it('campo ausente (undefined) preserva o valor atual', async () => {
      const output = await useCase.execute({
        taskId: TASK_ID,
        title: 'Novo titulo',
      })

      expect(output.title).toBe('Novo titulo')
      expect(output.description).toBe('Descricao original')
      expect(output.dueDate).toEqual(new Date('2026-04-01T18:00:00.000Z'))
      expect(output.teams).toHaveLength(1)
    })

    it('null limpa o campo explicitamente', async () => {
      const output = await useCase.execute({
        taskId: TASK_ID,
        description: null,
        dueDate: null,
      })

      expect(output.description).toBeNull()
      expect(output.dueDate).toBeNull()
    })
  })

  describe('vinculo com times', () => {
    it('substitui o conjunto de times', async () => {
      const output = await useCase.execute({
        taskId: TASK_ID,
        teamIds: [TEAM_DESIGN],
      })

      expect(output.teams.map((team) => team.id)).toEqual([TEAM_DESIGN])
    })

    it('permite desvincular todos os times', async () => {
      const output = await useCase.execute({ taskId: TASK_ID, teamIds: [] })

      expect(output.teams).toEqual([])
    })

    it('valida a existencia dos times ANTES de aplicar qualquer mudanca', async () => {
      await expect(
        useCase.execute({
          taskId: TASK_ID,
          title: 'Titulo que nao deve ser salvo',
          teamIds: ['99999999-9999-4999-8999-999999999999'],
        }),
      ).rejects.toThrow(TeamsNotFoundError)

      const stored = await taskRepository.findById(
        UniqueEntityId.create(TASK_ID),
      )

      expect(stored?.title.value).toBe('Implementar listagem')
    })
  })
})
