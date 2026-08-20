import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  CreateTaskBody,
  TaskDTO,
  TaskStatusValue,
  UpdateTaskBody,
} from '@teams-tasks/shared'
import { queryKeys } from '@/api/query-keys'
import { type TaskListFilters, tasksApi } from '@/api/tasks.api'
import type { ItemResponse, ListResponse } from '@/api/types'

export const TASKS_PAGE_SIZE = 20

type TaskPages = InfiniteData<ListResponse<TaskDTO>>

/**
 * Listagem paginada. `useInfiniteQuery` sobre limit/offset é o que permite o
 * "carregar mais" da tela consumindo a mesma paginação que a API expõe.
 */
export function useTasks(filters: TaskListFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: ({ pageParam, signal }) =>
      tasksApi.list(
        { ...filters, limit: TASKS_PAGE_SIZE, offset: pageParam },
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore
        ? lastPage.meta.offset + lastPage.meta.limit
        : undefined,
  })
}

/** Achata as páginas e expõe o total, que vem do meta da API. */
export function flattenTaskPages(pages: TaskPages | undefined): {
  tasks: TaskDTO[]
  total: number
} {
  if (!pages) return { tasks: [], total: 0 }

  return {
    tasks: pages.pages.flatMap((page) => page.data),
    total: pages.pages[0]?.meta.total ?? 0,
  }
}

export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId ?? ''),
    queryFn: ({ signal }) => tasksApi.detail(taskId as string, signal),
    enabled: Boolean(taskId),
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateTaskBody) => tasksApi.create(body),
    onSuccess: (created) => {
      // Semeia o detalhe: navegar para a tarefa recém-criada não mostra loading.
      queryClient.setQueryData<ItemResponse<TaskDTO>>(
        queryKeys.tasks.detail(created.data.id),
        created,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
      // A contagem de tarefas por time muda.
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: UpdateTaskBody) => tasksApi.update(taskId, body),
    onSuccess: (updated) => {
      queryClient.setQueryData<ItemResponse<TaskDTO>>(
        queryKeys.tasks.detail(taskId),
        updated,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

/**
 * Ação rápida com OPTIMISTIC UPDATE.
 *
 * O usuário toca no círculo e a UI responde na hora; a requisição corre atrás.
 * Se falhar, o estado anterior é restaurado a partir do snapshot.
 *
 * Duas sutilezas separam "otimista" de "otimista e correto":
 *
 * 1. `isOverdue` é recalculado localmente. Tarefa concluída não está atrasada,
 *    e sem isso o rótulo vermelho ficaria na tela até a revalidação.
 *
 * 2. Listas FILTRADAS por status têm o item REMOVIDO, não apenas atualizado.
 *    O filtro está na própria query key, então dá para saber que, numa lista
 *    "Pendente", a tarefa que acabou de virar "Concluída" não pertence mais.
 */
export function useChangeTaskStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string
      status: TaskStatusValue
    }) => tasksApi.changeStatus(taskId, status),

    onMutate: async ({ taskId, status }) => {
      // Cancela requisições em voo para que uma resposta antiga não sobrescreva
      // o estado otimista que acabamos de escrever.
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all })

      const snapshot = snapshotTaskQueries(queryClient)

      patchTaskInLists(queryClient, taskId, (task) => ({
        ...task,
        status,
        isOverdue: status === 'DONE' ? false : task.isOverdue,
      }))

      queryClient.setQueryData<ItemResponse<TaskDTO>>(
        queryKeys.tasks.detail(taskId),
        (current) =>
          current
            ? {
                data: {
                  ...current.data,
                  status,
                  isOverdue: status === 'DONE' ? false : current.data.isOverdue,
                },
              }
            : current,
      )

      return { snapshot }
    },

    onError: (_error, _variables, context) => {
      restoreTaskQueries(queryClient, context?.snapshot)
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => tasksApi.remove(taskId),

    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.lists() })

      const snapshot = snapshotTaskQueries(queryClient)

      patchTaskInLists(queryClient, taskId, null)

      return { snapshot }
    },

    onError: (_error, _taskId, context) => {
      restoreTaskQueries(queryClient, context?.snapshot)
    },

    onSettled: (_data, _error, taskId) => {
      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

// ---------- Helpers de cache ----------

type TaskQuerySnapshot = ReturnType<typeof snapshotTaskQueries>

function snapshotTaskQueries(queryClient: QueryClient) {
  return queryClient.getQueriesData({ queryKey: queryKeys.tasks.all })
}

function restoreTaskQueries(
  queryClient: QueryClient,
  snapshot: TaskQuerySnapshot | undefined,
): void {
  for (const [key, value] of snapshot ?? []) {
    queryClient.setQueryData(key, value)
  }
}

/** Lê o filtro de status embutido na query key da lista. */
function statusFilterOf(queryKey: readonly unknown[]): TaskStatusValue | null {
  const filters = queryKey[queryKey.length - 1]

  if (typeof filters !== 'object' || filters === null) return null

  return (filters as TaskListFilters).status ?? null
}

/**
 * Aplica uma transformação a uma tarefa em TODAS as listas paginadas em cache.
 *
 * `patch === null` remove a tarefa (usado no delete otimista). Um patch que
 * faça a tarefa deixar de casar com o filtro da lista também a remove daquela
 * lista — e o meta.total é ajustado em todas as páginas, porque é a primeira
 * delas que a tela usa para mostrar a contagem.
 */
function patchTaskInLists(
  queryClient: QueryClient,
  taskId: string,
  patch: ((task: TaskDTO) => TaskDTO) | null,
): void {
  const lists = queryClient.getQueriesData<TaskPages>({
    queryKey: queryKeys.tasks.lists(),
  })

  for (const [key, current] of lists) {
    if (!current) continue

    const existing = current.pages
      .flatMap((page) => page.data)
      .find((task) => task.id === taskId)

    if (!existing) continue

    const updated = patch ? patch(existing) : null
    const statusFilter = statusFilterOf(key)
    const shouldRemove =
      updated === null ||
      (statusFilter !== null && updated.status !== statusFilter)

    queryClient.setQueryData<TaskPages>(key, {
      ...current,
      pages: current.pages.map((page) => ({
        data: shouldRemove
          ? page.data.filter((task) => task.id !== taskId)
          : page.data.map((task) => (task.id === taskId ? updated : task)),
        meta: shouldRemove
          ? { ...page.meta, total: Math.max(0, page.meta.total - 1) }
          : page.meta,
      })),
    })
  }
}
