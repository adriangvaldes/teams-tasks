import { beforeEach, describe, expect, it } from 'vitest'
import { TeamLoader } from '../../../src/application/services/team-loader.service'
import { ChangeTaskStatus } from '../../../src/application/use-cases/task/change-task-status.use-case'
import { UniqueEntityId } from '../../../src/domain/shared/unique-entity-id'
import {
  InvalidTaskStatusError,
  TaskNotFoundError,
} from '../../../src/domain/task/errors/task-errors'
import { Task } from '../../../src/domain/task/task.entity'
import { FixedClock } from '../../fakes/fixed-clock'
import { InMemoryTaskRepository } from '../../fakes/in-memory-task.repository'
import { InMemoryTeamRepository } from '../../fakes/in-memory-team.repository'
import { RecordingLogger } from '../../fakes/recording-logger'

const TASK_ID = 'a0000001-0000-4000-8000-000000000001'
const NOW = new Date('2026-03-10T12:00:00.000Z')

describe('ChangeTaskStatus', () => {
  let taskRepository: InMemoryTaskRepository
  let logger: RecordingLogger
  let clock: FixedClock
  let useCase: ChangeTaskStatus

  beforeEach(async () => {
    taskRepository = new InMemoryTaskRepository()
    logger = new RecordingLogger()
    clock = new FixedClock(NOW)

    useCase = new ChangeTaskStatus(
      taskRepository,
      new TeamLoader(new InMemoryTeamRepository()),
      clock,
      logger,
    )

    await taskRepository.create(
      Task.create(
        { title: 'Implementar listagem', status: 'PENDING' },
        UniqueEntityId.create(TASK_ID),
        NOW,
      ),
    )
  })

  it('marca a tarefa como concluida e devolve o estado atualizado', async () => {
    clock.advanceBy(60_000)

    const output = await useCase.execute({ taskId: TASK_ID, status: 'DONE' })

    expect(output.status).toBe('DONE')
    expect(output.updatedAt).toEqual(new Date('2026-03-10T12:01:00.000Z'))
  })

  it('persiste a mudanca no repositorio', async () => {
    await useCase.execute({ taskId: TASK_ID, status: 'IN_PROGRESS' })

    const stored = await taskRepository.findById(UniqueEntityId.create(TASK_ID))

    expect(stored?.status.value).toBe('IN_PROGRESS')
  })

  it('registra a transicao no log, com origem e destino', async () => {
    await useCase.execute({ taskId: TASK_ID, status: 'DONE' })

    expect(logger.entries).toEqual([
      {
        level: 'info',
        message: 'Status da tarefa alterado',
        context: { taskId: TASK_ID, from: 'PENDING', to: 'DONE' },
      },
    ])
  })

  it('falha com NOT_FOUND quando a tarefa nao existe', async () => {
    await expect(
      useCase.execute({
        taskId: '99999999-9999-4999-8999-999999999999',
        status: 'DONE',
      }),
    ).rejects.toThrow(TaskNotFoundError)
  })

  it('rejeita status desconhecido sem alterar a tarefa', async () => {
    await expect(
      useCase.execute({ taskId: TASK_ID, status: 'ARQUIVADA' }),
    ).rejects.toThrow(InvalidTaskStatusError)

    const stored = await taskRepository.findById(UniqueEntityId.create(TASK_ID))

    expect(stored?.status.value).toBe('PENDING')
  })
})
