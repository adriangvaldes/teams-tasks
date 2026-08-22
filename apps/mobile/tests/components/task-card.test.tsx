import type { TaskDTO } from '@teams-tasks/shared'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { TaskCard } from '@/components/task-card'

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 'a0000001-0000-4000-8000-000000000001',
    title: 'Implementar tela de listagem',
    description: 'Lista global com filtros.',
    status: 'PENDING',
    dueDate: null,
    teams: [],
    isOverdue: false,
    createdAt: '2026-08-20T12:00:00.000Z',
    updatedAt: '2026-08-20T12:00:00.000Z',
    ...overrides,
  }
}

const noop = () => {}

function renderCard(
  task: TaskDTO,
  handlers: Partial<{ onPress: () => void; onToggleStatus: () => void }> = {},
) {
  return render(
    <TaskCard
      task={task}
      onPress={handlers.onPress ?? noop}
      onToggleStatus={handlers.onToggleStatus ?? noop}
    />,
  )
}

describe('TaskCard', () => {
  it('mostra título, descrição e o rótulo do status', async () => {
    await renderCard(makeTask())

    expect(screen.getByText('Implementar tela de listagem')).toBeTruthy()
    expect(screen.getByText('Lista global com filtros.')).toBeTruthy()
    expect(screen.getByText('Pendente')).toBeTruthy()
  })

  it('renderiza a cor do time como chip', async () => {
    await renderCard(
      makeTask({
        teams: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Squad Alpha',
            colorHex: '#2563EB',
          },
        ],
      }),
    )

    expect(screen.getByLabelText('Time Squad Alpha')).toBeTruthy()
  })

  it('indica ausência de time quando a tarefa não tem nenhum', async () => {
    await renderCard(makeTask())

    expect(screen.getByText('Sem time')).toBeTruthy()
  })

  it('resume os times excedentes em vez de estourar o layout', async () => {
    const teams = ['#2563EB', '#DB2777', '#059669', '#D97706'].map(
      (colorHex, index) => ({
        id: `1111111${index}-1111-4111-8111-111111111111`,
        name: `Time ${index}`,
        colorHex,
      }),
    )

    await renderCard(makeTask({ teams }))

    expect(screen.getByText('+1')).toBeTruthy()
  })

  describe('ação rápida de status', () => {
    it('dispara onToggleStatus sem acionar o onPress do card', async () => {
      const onToggleStatus = jest.fn()
      const onPress = jest.fn()

      await renderCard(makeTask(), { onPress, onToggleStatus })

      await fireEvent.press(
        screen.getByLabelText(
          'Avançar status da tarefa Implementar tela de listagem',
        ),
      )

      expect(onToggleStatus).toHaveBeenCalledTimes(1)
      expect(onPress).not.toHaveBeenCalled()
    })

    it('expõe o estado de checkbox marcado quando concluída', async () => {
      await renderCard(makeTask({ status: 'DONE' }))

      const toggle = screen.getByLabelText(
        'Reabrir tarefa Implementar tela de listagem',
      )

      expect(toggle.props.accessibilityState).toMatchObject({ checked: true })
    })
  })

  it('abre o detalhe ao tocar no corpo do card', async () => {
    const onPress = jest.fn()

    await renderCard(makeTask(), { onPress })

    await fireEvent.press(
      screen.getByLabelText('Tarefa Implementar tela de listagem'),
    )

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  describe('prazo', () => {
    it('mostra rótulo de prazo quando há data', async () => {
      await renderCard(
        makeTask({ dueDate: '2020-01-01T18:00:00.000Z', isOverdue: true }),
      )

      expect(screen.getByText(/Vence em/)).toBeTruthy()
    })

    it('não mostra rótulo de prazo quando a tarefa não tem data', async () => {
      await renderCard(makeTask())

      expect(screen.queryByText(/Vence/)).toBeNull()
    })
  })
})
