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

/**
 * O BottomSheet e so a moldura animada: reanimated carrega worklets nativos no
 * import e derruba a suite inteira. O que estes testes verificam e o CONTEUDO
 * do sheet, entao a moldura vira uma View que respeita `visible`.
 */
jest.mock('@/components/ui/bottom-sheet', () => {
  const MockReact = require('react')

  return {
    BottomSheet: ({
      visible,
      children,
    }: {
      visible: boolean
      children: React.ReactNode
    }) => (visible ? MockReact.createElement('View', null, children) : null),
  }
})

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
    statuses: [],
    onToggleStatus: noop,
    teams: TEAMS,
    selectedTeams: [],
    onToggleTeam: noop,
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
    const onToggleStatus = jest.fn<void, [TaskStatusValue | null]>()
    await renderSheet({ onToggleStatus })

    await fireEvent.press(screen.getByLabelText('Status Concluídas'))

    expect(onToggleStatus).toHaveBeenCalledWith('DONE')
  })

  it('emite o time escolhido', async () => {
    const onToggleTeam = jest.fn<void, [string | null]>()
    await renderSheet({ onToggleTeam })

    await fireEvent.press(screen.getByLabelText('Time Design System'))

    expect(onToggleTeam).toHaveBeenCalledWith(DESIGN)
  })

  it('marca todos os valores selecionados, nao apenas um', async () => {
    await renderSheet({
      statuses: ['PENDING', 'DONE'],
      selectedTeams: [ALPHA, DESIGN],
    })

    expect(
      screen.getByLabelText('Status Pendentes').props.accessibilityState,
    ).toMatchObject({ selected: true })
    expect(
      screen.getByLabelText('Status Concluídas').props.accessibilityState,
    ).toMatchObject({ selected: true })
    expect(
      screen.getByLabelText('Time Squad Alpha').props.accessibilityState,
    ).toMatchObject({ selected: true })
    expect(
      screen.getByLabelText('Time Design System').props.accessibilityState,
    ).toMatchObject({ selected: true })
  })

  it('emite o time ja ativo, para que a tela o remova', async () => {
    const onToggleTeam = jest.fn<void, [string | null]>()
    await renderSheet({ selectedTeams: [ALPHA], onToggleTeam })

    await fireEvent.press(screen.getByLabelText('Time Squad Alpha'))

    expect(onToggleTeam).toHaveBeenCalledWith(ALPHA)
  })

  it('a opcao "todos" fica marcada quando nada esta escolhido', async () => {
    await renderSheet({ statuses: [], selectedTeams: [] })

    expect(
      screen.getByLabelText('Status Todas').props.accessibilityState,
    ).toMatchObject({ selected: true })
    expect(
      screen.getByLabelText('Todos os times').props.accessibilityState,
    ).toMatchObject({ selected: true })
  })

  it('a opcao "todos" limpa aquele filtro', async () => {
    const onToggleStatus = jest.fn<void, [TaskStatusValue | null]>()
    const onToggleTeam = jest.fn<void, [string | null]>()

    await renderSheet({
      statuses: ['PENDING'],
      selectedTeams: [ALPHA],
      onToggleStatus,
      onToggleTeam,
    })

    await fireEvent.press(screen.getByLabelText('Status Todas'))
    await fireEvent.press(screen.getByLabelText('Todos os times'))

    expect(onToggleStatus).toHaveBeenCalledWith(null)
    expect(onToggleTeam).toHaveBeenCalledWith(null)
  })

  it('so oferece limpar quando ha filtro ativo', async () => {
    const semFiltro = await renderSheet({ hasFilters: false })
    expect(semFiltro.queryByLabelText('Limpar filtros')).toBeNull()
    await semFiltro.unmount()

    const comFiltro = await renderSheet({ hasFilters: true })
    expect(comFiltro.getByLabelText('Limpar filtros')).toBeTruthy()
  })

  it('fecha pelo botao de aplicar, que anuncia o resultado', async () => {
    const onClose = jest.fn()
    await renderSheet({ onClose, resultLabel: 'Ver 3 tarefas' })

    expect(screen.getByText('Ver 3 tarefas')).toBeTruthy()

    await fireEvent.press(screen.getByLabelText('Aplicar filtros'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('nao renderiza nada quando esta fechado', async () => {
    await renderSheet({ visible: false })

    expect(screen.queryByLabelText('Status Pendentes')).toBeNull()
  })
})
