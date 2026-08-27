import { STATUS_APPEARANCE, toggleDone } from '@/lib/task-status'

describe('toggleDone', () => {
  it('conclui uma tarefa pendente', () => {
    expect(toggleDone('PENDING')).toBe('DONE')
  })

  it('conclui uma tarefa em progresso', () => {
    expect(toggleDone('IN_PROGRESS')).toBe('DONE')
  })

  it('reabre uma tarefa concluida como pendente', () => {
    expect(toggleDone('DONE')).toBe('PENDING')
  })

  it('e binario: dois toques voltam ao ponto de partida', () => {
    expect(toggleDone(toggleDone('PENDING'))).toBe('PENDING')
    expect(toggleDone(toggleDone('DONE'))).toBe('DONE')
  })

  it('nunca devolve IN_PROGRESS, que so existe no seletor do detalhe', () => {
    const alcancaveis = (['PENDING', 'IN_PROGRESS', 'DONE'] as const).map(
      toggleDone,
    )

    expect(alcancaveis).not.toContain('IN_PROGRESS')
  })
})

describe('STATUS_APPEARANCE', () => {
  it('rotula os tres status em portugues', () => {
    expect(STATUS_APPEARANCE.PENDING.label).toBe('Pendente')
    expect(STATUS_APPEARANCE.IN_PROGRESS.label).toBe('Em Progresso')
    expect(STATUS_APPEARANCE.DONE.label).toBe('Concluída')
  })
})
