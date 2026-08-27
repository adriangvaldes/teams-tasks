import type { TaskStatusValue, TeamDTO } from '@teams-tasks/shared'
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native'
import {
  type StatusOption,
  TaskFilterSheet,
} from '@/components/task-filter-sheet'

const ALPHA = '11111111-1111-4111-8111-111111111111'
const DESIGN = '22222222-2222-4222-8222-222222222222'

const STATUS_OPTIONS: StatusOption[] = [
  { value: null, label: 'Todas' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'DONE', label: 'Concluídas' },
]

function makeTeam(id: string, name: string, colorHex: string): TeamDTO {
  return {
    id,
    name,
    colorHex,
    description: null,
    taskCount: 0,
    createdAt: '2026-08-20T12:00:00.000Z',
    updatedAt: '2026-08-20T12:00:00.000Z',
  }
}

const TEAMS = [
  makeTeam(ALPHA, 'Squad Alpha', '#2563EB'),
  makeTeam(DESIGN, 'Design System', '#DB2777'),
]

/**
 * O cleanup automatico do RNTL nao e aguardado entre os testes neste setup, e
 * um render pendente faz o proximo voltar vazio. Aqui ele e explicito.
 */
afterEach(async () => {
  await cleanup()
})

const noop = () => {}

async function renderSheet(
  overrides: Partial<React.ComponentProps<typeof TaskFilterSheet>> = {},
) {
  const props: React.ComponentProps<typeof TaskFilterSheet> = {
    visible: true,
    onClose: noop,
    statusOptions: STATUS_OPTIONS,
    status: null,
    onStatusChange: noop,
    teams: TEAMS,
    team: null,
    onTeamChange: noop,
    hasFilters: false,
    onClear: noop,
    resultLabel: 'Ver 10 tarefas',
    ...overrides,
  }

  return await render(<TaskFilterSheet {...props} />)
}

describe('TaskFilterSheet', () => {
  it('lista as opcoes de status e de time', async () => {
    await renderSheet()

    expect(screen.getByLabelText('Status Pendentes')).toBeTruthy()
    expect(screen.getByLabelText('Time Squad Alpha')).toBeTruthy()
    expect(screen.getByLabelText('Time Design System')).toBeTruthy()
    expect(screen.getByLabelText('Todos os times')).toBeTruthy()
  })

  it('omite a secao de times quando nao ha times para escolher', async () => {
    await renderSheet({ teams: [] })

    expect(screen.getByLabelText('Status Pendentes')).toBeTruthy()
    expect(screen.queryByLabelText('Todos os times')).toBeNull()
    expect(screen.queryByText('Time')).toBeNull()
  })

  it('emite o status escolhido', async () => {
    const onStatusChange = jest.fn<void, [TaskStatusValue | null]>()
    await renderSheet({ onStatusChange })

    await fireEvent.press(screen.getByLabelText('Status Concluídas'))

    expect(onStatusChange).toHaveBeenCalledWith('DONE')
  })

  it('emite o time escolhido', async () => {
    const onTeamChange = jest.fn<void, [string | null]>()
    await renderSheet({ onTeamChange })

    await fireEvent.press(screen.getByLabelText('Time Design System'))

    expect(onTeamChange).toHaveBeenCalledWith(DESIGN)
  })

  it('deseleciona ao tocar no time que ja estava ativo', async () => {
    const onTeamChange = jest.fn<void, [string | null]>()
    await renderSheet({ team: ALPHA, onTeamChange })

    await fireEvent.press(screen.getByLabelText('Time Squad Alpha'))

    expect(onTeamChange).toHaveBeenCalledWith(null)
  })

  it('so oferece limpar quando ha filtro ativo', async () => {
    const semFiltro = await renderSheet({ hasFilters: false })
    expect(semFiltro.queryByLabelText('Limpar filtros')).toBeNull()
    await semFiltro.unmount()

    const comFiltro = await renderSheet({ hasFilters: true })
    expect(comFiltro.getByLabelText('Limpar filtros')).toBeTruthy()
  })

  it('fecha pelo botao de aplicar e pelo fundo', async () => {
    const onClose = jest.fn()
    await renderSheet({ onClose })

    await fireEvent.press(screen.getByLabelText('Aplicar filtros'))
    await fireEvent.press(screen.getByLabelText('Fechar filtros'))

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('nao renderiza nada quando esta fechado', async () => {
    await renderSheet({ visible: false })

    expect(screen.queryByLabelText('Status Pendentes')).toBeNull()
  })
})
