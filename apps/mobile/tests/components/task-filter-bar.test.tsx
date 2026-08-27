import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native'
import { type ActiveFilter, TaskFilterBar } from '@/components/task-filter-bar'

/**
 * O cleanup automatico do RNTL nao e aguardado entre os testes neste setup, e
 * um render pendente faz o proximo voltar vazio. Aqui ele e explicito.
 */
afterEach(async () => {
  await cleanup()
})

const noop = () => {}

async function renderBar(activeFilters: ActiveFilter[], onOpen = noop) {
  return await render(
    <TaskFilterBar activeFilters={activeFilters} onOpen={onOpen} />,
  )
}

describe('TaskFilterBar', () => {
  it('sem filtro ativo, mostra apenas o botao', async () => {
    await renderBar([])

    expect(screen.getByLabelText('Abrir filtros')).toBeTruthy()
    expect(screen.queryByLabelText(/Remover filtro/)).toBeNull()
  })

  it('anuncia quantos filtros estao ativos', async () => {
    await renderBar([
      { key: 'status', label: 'Pendentes', onRemove: noop },
      { key: 'team', label: 'Squad Alpha', color: '#2563EB', onRemove: noop },
    ])

    expect(screen.getByLabelText('Abrir filtros, 2 ativo(s)')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('mostra cada filtro ativo como chip removivel', async () => {
    const removeStatus = jest.fn()
    const removeTeam = jest.fn()

    await renderBar([
      { key: 'status', label: 'Pendentes', onRemove: removeStatus },
      {
        key: 'team',
        label: 'Squad Alpha',
        color: '#2563EB',
        onRemove: removeTeam,
      },
    ])

    await fireEvent.press(screen.getByLabelText('Remover filtro Pendentes'))
    expect(removeStatus).toHaveBeenCalledTimes(1)
    expect(removeTeam).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByLabelText('Remover filtro Squad Alpha'))
    expect(removeTeam).toHaveBeenCalledTimes(1)
  })

  it('abre o sheet pelo botao', async () => {
    const onOpen = jest.fn()
    await renderBar([], onOpen)

    await fireEvent.press(screen.getByLabelText('Abrir filtros'))

    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
