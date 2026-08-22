import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { TaskForm } from '@/components/task-form'
import { EMPTY_TASK_FORM } from '@/forms/task-form.schema'
import {
  listResponse,
  mockFetchRoutes,
  renderWithProviders,
} from '../test-utils'

const TEAM = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Squad Alpha',
  colorHex: '#2563EB',
  description: null,
  taskCount: 0,
  createdAt: '2026-08-20T12:00:00.000Z',
  updatedAt: '2026-08-20T12:00:00.000Z',
}

async function renderForm() {
  mockFetchRoutes([{ match: '/api/teams', body: listResponse([TEAM]) }])

  const onSubmit = jest.fn()

  const utils = await renderWithProviders(
    <TaskForm
      submitLabel="Criar tarefa"
      isSubmitting={false}
      onSubmit={onSubmit}
      onCancel={jest.fn()}
    />,
  )

  await screen.findByLabelText('Time Squad Alpha')

  return { ...utils, onSubmit }
}

describe('TaskForm', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('bloqueia o envio e mostra o erro quando o título tem menos de 3 caracteres', async () => {
    const { onSubmit } = await renderForm()

    await fireEvent.changeText(screen.getByLabelText('Título'), 'ab')
    await fireEvent.press(screen.getByLabelText('Criar tarefa'))

    expect(
      await screen.findByText('Título deve ter ao menos 3 caracteres'),
    ).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejeita prazo em formato inválido', async () => {
    const { onSubmit } = await renderForm()

    await fireEvent.changeText(screen.getByLabelText('Título'), 'Tarefa válida')
    await fireEvent.changeText(screen.getByLabelText('Prazo'), '31022026')
    await fireEvent.press(screen.getByLabelText('Criar tarefa'))

    expect(await screen.findByText('Use o formato dd/mm/aaaa')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('aplica máscara de data conforme o usuário digita', async () => {
    await renderForm()

    const dueDate = screen.getByLabelText('Prazo')
    await fireEvent.changeText(dueDate, '15092026')

    expect(screen.getByLabelText('Prazo').props.value).toBe('15/09/2026')
  })

  it('envia os valores do formulário quando tudo é válido', async () => {
    const { onSubmit } = await renderForm()

    await fireEvent.changeText(
      screen.getByLabelText('Título'),
      'Integrar app ao deploy',
    )
    await fireEvent.changeText(
      screen.getByLabelText('Descrição'),
      'Apontar a URL',
    )
    await fireEvent.press(screen.getByLabelText('Criar tarefa'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Integrar app ao deploy',
        description: 'Apontar a URL',
        status: 'PENDING',
        dueDate: '',
        teamIds: [],
      }),
      expect.anything(),
    )
  })

  it('permite escolher o status antes de enviar', async () => {
    const { onSubmit } = await renderForm()

    await fireEvent.changeText(
      screen.getByLabelText('Título'),
      'Tarefa em progresso',
    )
    await fireEvent.press(screen.getByLabelText('Em Progresso'))
    await fireEvent.press(screen.getByLabelText('Criar tarefa'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'IN_PROGRESS' }),
      expect.anything(),
    )
  })

  it('vincula times selecionados no seletor carregado da API', async () => {
    const { onSubmit } = await renderForm()

    const teamChip = screen.getByLabelText('Time Squad Alpha')

    await fireEvent.changeText(
      screen.getByLabelText('Título'),
      'Tarefa com time',
    )
    await fireEvent.press(teamChip)
    await fireEvent.press(screen.getByLabelText('Criar tarefa'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ teamIds: [TEAM.id] }),
      expect.anything(),
    )
  })

  it('começa com o formulário vazio', async () => {
    await renderForm()

    expect(screen.getByLabelText('Título').props.value).toBe(
      EMPTY_TASK_FORM.title,
    )
  })
})
