import {
  type InfiniteData,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import type { TaskDTO, TaskStatusValue } from '@teams-tasks/shared'
import { renderHook, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { queryKeys } from '@/api/query-keys'
import type { TaskListFilters } from '@/api/tasks.api'
import type { ListResponse } from '@/api/types'
import { useChangeTaskStatus, useDeleteTask } from '@/hooks/use-tasks'

/**
 * gcTime infinito de proposito: estes testes escrevem no cache SEM observador
 * montado, e com gcTime zero o React Query descartaria os dados semeados antes
 * de a mutacao rodar.
 */
function createCacheClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  })
}

const TASK_ID = 'a0000001-0000-4000-8000-000000000001'

type TaskPages = InfiniteData<ListResponse<TaskDTO>>

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: TASK_ID,
    title: 'Implementar listagem',
    description: null,
    status: 'PENDING',
    dueDate: '2020-01-01T18:00:00.000Z',
    teams: [],
    isOverdue: true,
    createdAt: '2026-08-20T12:00:00.000Z',
    updatedAt: '2026-08-20T12:00:00.000Z',
    ...overrides,
  }
}

function seedList(
  client: QueryClient,
  filters: TaskListFilters,
  tasks: TaskDTO[],
  total = tasks.length,
): void {
  client.setQueryData<TaskPages>(queryKeys.tasks.list(filters), {
    pageParams: [0],
    pages: [
      { data: tasks, meta: { total, limit: 20, offset: 0, hasMore: false } },
    ],
  })
}

function readList(client: QueryClient, filters: TaskListFilters) {
  return client.getQueryData<TaskPages>(queryKeys.tasks.list(filters))
}

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

/** Promise cujo desfecho o teste controla, para observar o estado otimista. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function mockFetch(response: Promise<unknown>): void {
  globalThis.fetch = (() =>
    response.then((body) => ({
      ok: true,
      status: 200,
      json: async () => body,
    }))) as unknown as typeof fetch
}

describe('useChangeTaskStatus', () => {
  let client: QueryClient

  beforeEach(() => {
    client = createCacheClient()
  })

  afterEach(() => {
    client.clear()
  })

  it('atualiza a lista ANTES da resposta do servidor', async () => {
    const filters: TaskListFilters = { sort: 'createdAt:desc' }
    seedList(client, filters, [makeTask()])

    const pending = deferred<unknown>()
    mockFetch(pending.promise)

    const { result } = await renderHook(() => useChangeTaskStatus(), {
      wrapper: wrapperFor(client),
    })

    result.current.mutate({ taskId: TASK_ID, status: 'DONE' })

    await waitFor(() => {
      expect(readList(client, filters)?.pages[0]?.data[0]?.status).toBe('DONE')
    })

    // A requisicao ainda nem foi respondida.
    pending.resolve({ data: makeTask({ status: 'DONE' }) })
  })

  it('recalcula isOverdue: tarefa concluida nao esta atrasada', async () => {
    const filters: TaskListFilters = { sort: 'createdAt:desc' }
    seedList(client, filters, [makeTask({ isOverdue: true })])

    const pending = deferred<unknown>()
    mockFetch(pending.promise)

    const { result } = await renderHook(() => useChangeTaskStatus(), {
      wrapper: wrapperFor(client),
    })

    result.current.mutate({ taskId: TASK_ID, status: 'DONE' })

    await waitFor(() => {
      expect(readList(client, filters)?.pages[0]?.data[0]?.isOverdue).toBe(
        false,
      )
    })

    pending.resolve({ data: makeTask({ status: 'DONE', isOverdue: false }) })
  })

  it('mantem a tarefa quando o novo status ainda casa com a lista de filtros', async () => {
    const pendenteOuConcluida: TaskListFilters = {
      status: ['PENDING', 'DONE'],
    }

    seedList(client, pendenteOuConcluida, [makeTask()], 5)

    const pending = deferred<unknown>()
    mockFetch(pending.promise)

    const { result } = await renderHook(() => useChangeTaskStatus(), {
      wrapper: wrapperFor(client),
    })

    result.current.mutate({ taskId: TASK_ID, status: 'DONE' })

    await waitFor(() => {
      expect(
        readList(client, pendenteOuConcluida)?.pages[0]?.data[0]?.status,
      ).toBe('DONE')
    })

    // Continua na lista porque DONE tambem esta entre os filtros selecionados.
    expect(readList(client, pendenteOuConcluida)?.pages[0]?.data).toHaveLength(
      1,
    )
    expect(readList(client, pendenteOuConcluida)?.pages[0]?.meta.total).toBe(5)

    pending.resolve({ data: makeTask({ status: 'DONE' }) })
  })

  it('remove a tarefa da lista filtrada que ela deixou de casar', async () => {
    const pendentes: TaskListFilters = { status: ['PENDING'] }
    const todas: TaskListFilters = { sort: 'createdAt:desc' }

    seedList(client, pendentes, [makeTask()], 7)
    seedList(client, todas, [makeTask()], 12)

    const pending = deferred<unknown>()
    mockFetch(pending.promise)

    const { result } = await renderHook(() => useChangeTaskStatus(), {
      wrapper: wrapperFor(client),
    })

    result.current.mutate({ taskId: TASK_ID, status: 'DONE' })

    await waitFor(() => {
      expect(readList(client, pendentes)?.pages[0]?.data).toHaveLength(0)
    })

    // Some da lista "Pendentes" e o total dela cai...
    expect(readList(client, pendentes)?.pages[0]?.meta.total).toBe(6)
    // ...mas permanece na lista sem filtro de status, apenas atualizada.
    expect(readList(client, todas)?.pages[0]?.data[0]?.status).toBe('DONE')
    expect(readList(client, todas)?.pages[0]?.meta.total).toBe(12)

    pending.resolve({ data: makeTask({ status: 'DONE' }) })
  })

  it('desfaz a alteracao quando a requisicao falha', async () => {
    const filters: TaskListFilters = { sort: 'createdAt:desc' }
    seedList(client, filters, [makeTask({ status: 'PENDING' })])

    globalThis.fetch = (() =>
      Promise.reject(new Error('rede indisponivel'))) as unknown as typeof fetch

    const { result } = await renderHook(() => useChangeTaskStatus(), {
      wrapper: wrapperFor(client),
    })

    result.current.mutate({ taskId: TASK_ID, status: 'DONE' })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(readList(client, filters)?.pages[0]?.data[0]?.status).toBe('PENDING')
  })

  it('atualiza tambem o detalhe em cache', async () => {
    client.setQueryData(queryKeys.tasks.detail(TASK_ID), { data: makeTask() })

    const pending = deferred<unknown>()
    mockFetch(pending.promise)

    const { result } = await renderHook(() => useChangeTaskStatus(), {
      wrapper: wrapperFor(client),
    })

    result.current.mutate({ taskId: TASK_ID, status: 'IN_PROGRESS' })

    await waitFor(() => {
      const detail = client.getQueryData<{ data: TaskDTO }>(
        queryKeys.tasks.detail(TASK_ID),
      )
      expect(detail?.data.status).toBe('IN_PROGRESS')
    })

    pending.resolve({ data: makeTask({ status: 'IN_PROGRESS' }) })
  })

  it.each<[TaskStatusValue, TaskStatusValue]>([
    ['PENDING', 'IN_PROGRESS'],
    ['IN_PROGRESS', 'DONE'],
    ['DONE', 'PENDING'],
  ])('aplica a transicao %s -> %s', async (from, to) => {
    const filters: TaskListFilters = { sort: 'createdAt:desc' }
    seedList(client, filters, [makeTask({ status: from })])

    const pending = deferred<unknown>()
    mockFetch(pending.promise)

    const { result } = await renderHook(() => useChangeTaskStatus(), {
      wrapper: wrapperFor(client),
    })

    result.current.mutate({ taskId: TASK_ID, status: to })

    await waitFor(() => {
      expect(readList(client, filters)?.pages[0]?.data[0]?.status).toBe(to)
    })

    pending.resolve({ data: makeTask({ status: to }) })
  })
})

describe('useDeleteTask', () => {
  let client: QueryClient

  beforeEach(() => {
    client = createCacheClient()
  })

  afterEach(() => {
    client.clear()
  })

  it('remove da lista e ajusta o total antes da resposta', async () => {
    const filters: TaskListFilters = { sort: 'createdAt:desc' }
    seedList(client, filters, [makeTask(), makeTask({ id: 'outra' })], 9)

    const pending = deferred<unknown>()
    globalThis.fetch = (() =>
      pending.promise.then(() => ({
        ok: true,
        status: 204,
        json: async () => null,
      }))) as unknown as typeof fetch

    const { result } = await renderHook(() => useDeleteTask(), {
      wrapper: wrapperFor(client),
    })

    result.current.mutate(TASK_ID)

    await waitFor(() => {
      expect(readList(client, filters)?.pages[0]?.data).toHaveLength(1)
    })

    expect(readList(client, filters)?.pages[0]?.meta.total).toBe(8)

    pending.resolve(null)
  })

  it('recoloca a tarefa na lista quando a exclusao falha', async () => {
    const filters: TaskListFilters = { sort: 'createdAt:desc' }
    seedList(client, filters, [makeTask()])

    globalThis.fetch = (() =>
      Promise.reject(new Error('rede indisponivel'))) as unknown as typeof fetch

    const { result } = await renderHook(() => useDeleteTask(), {
      wrapper: wrapperFor(client),
    })

    result.current.mutate(TASK_ID)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(readList(client, filters)?.pages[0]?.data).toHaveLength(1)
  })
})
