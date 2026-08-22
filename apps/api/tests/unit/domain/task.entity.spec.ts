import { describe, expect, it } from 'vitest'
import { UniqueEntityId } from '../../../src/domain/shared/unique-entity-id'
import {
  DuplicateTeamAssignmentError,
  InvalidDueDateError,
  InvalidTaskStatusError,
  InvalidTaskTitleError,
} from '../../../src/domain/task/errors/task-errors'
import { Task } from '../../../src/domain/task/task.entity'

const ID = UniqueEntityId.create('a0000001-0000-4000-8000-000000000001')
const TEAM_A = '11111111-1111-4111-8111-111111111111'
const TEAM_B = '22222222-2222-4222-8222-222222222222'
const NOW = new Date('2026-03-10T12:00:00.000Z')

function makeTask(overrides: Partial<Parameters<typeof Task.create>[0]> = {}) {
  return Task.create({ title: 'Implementar listagem', ...overrides }, ID, NOW)
}

describe('Task', () => {
  it('nasce como PENDING quando o status nao e informado', () => {
    expect(makeTask().status.value).toBe('PENDING')
  })

  it('nasce sem nenhum time, o que o dominio permite', () => {
    expect(makeTask().teamIds).toEqual([])
  })

  it('aceita status em minusculas normalizando o valor', () => {
    expect(makeTask({ status: 'in_progress' }).status.value).toBe('IN_PROGRESS')
  })

  it('converte dueDate em string ISO para Date', () => {
    const task = makeTask({ dueDate: '2026-04-01T18:00:00.000Z' })

    expect(task.dueDate).toEqual(new Date('2026-04-01T18:00:00.000Z'))
  })

  describe('invariantes', () => {
    it('rejeita titulo com menos de 3 caracteres (requisito de aceitacao)', () => {
      expect(() => makeTask({ title: 'ab' })).toThrow(InvalidTaskTitleError)
    })

    it('aceita titulo com exatamente 3 caracteres', () => {
      expect(makeTask({ title: 'abc' }).title.value).toBe('abc')
    })

    it('rejeita titulo que só tem espacos', () => {
      expect(() => makeTask({ title: '     ' })).toThrow(InvalidTaskTitleError)
    })

    it('rejeita status desconhecido', () => {
      expect(() => makeTask({ status: 'ARQUIVADA' })).toThrow(
        InvalidTaskStatusError,
      )
    })

    it('rejeita dueDate impossivel de interpretar', () => {
      expect(() => makeTask({ dueDate: 'ontem' })).toThrow(InvalidDueDateError)
    })

    it('rejeita o mesmo time repetido na mesma tarefa', () => {
      expect(() => makeTask({ teamIds: [TEAM_A, TEAM_A] })).toThrow(
        DuplicateTeamAssignmentError,
      )
    })
  })

  describe('changeStatus', () => {
    it('atualiza o status e o updatedAt', () => {
      const task = makeTask()
      const later = new Date('2026-03-11T08:00:00.000Z')

      task.changeStatus('DONE', later)

      expect(task.status.value).toBe('DONE')
      expect(task.updatedAt).toEqual(later)
    })

    it('e idempotente: reenviar o mesmo status nao mexe em updatedAt', () => {
      const task = makeTask({ status: 'DONE' })
      const later = new Date('2026-03-11T08:00:00.000Z')

      task.changeStatus('DONE', later)

      expect(task.updatedAt).toEqual(NOW)
    })
  })

  describe('isOverdue', () => {
    const dueDate = '2026-03-09T18:00:00.000Z'

    it('e verdadeiro quando o prazo passou e a tarefa nao esta concluida', () => {
      expect(makeTask({ dueDate }).isOverdue(NOW)).toBe(true)
    })

    it('e falso quando a tarefa esta concluida, mesmo com prazo vencido', () => {
      expect(makeTask({ dueDate, status: 'DONE' }).isOverdue(NOW)).toBe(false)
    })

    it('e falso quando a tarefa nao tem prazo', () => {
      expect(makeTask().isOverdue(NOW)).toBe(false)
    })
  })

  describe('assignTeams', () => {
    it('substitui o conjunto de times (semantica de PUT)', () => {
      const task = makeTask({ teamIds: [TEAM_A] })

      task.assignTeams([TEAM_B], NOW)

      expect(task.teamIds.map(String)).toEqual([TEAM_B])
    })

    it('permite remover todos os times', () => {
      const task = makeTask({ teamIds: [TEAM_A, TEAM_B] })

      task.assignTeams([], NOW)

      expect(task.teamIds).toEqual([])
    })
  })

  it('devolve copia defensiva de teamIds: mutar o array nao afeta a entidade', () => {
    const task = makeTask({ teamIds: [TEAM_A] })

    const ids = task.teamIds as UniqueEntityId[]
    ids.push(UniqueEntityId.create(TEAM_B))

    expect(task.teamIds).toHaveLength(1)
  })
})
