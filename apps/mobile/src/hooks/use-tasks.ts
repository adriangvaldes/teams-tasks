import {
  keepPreviousData,
  type QueryClient,
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

export function useTasks(filters: TaskListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: ({ signal }) => tasksApi.list(filters, signal),
    placeholderData: keepPreviousData,
  })
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
 * O usuário toca no círculo e a UI responde imediatamente; a requisição corre
 * atrás. Se falhar, o estado anterior é restaurado a partir do snapshot.
 *
 * Duas sutilezas que fazem a diferença entre "otimista" e "otimista e correto":
 *
 * 1. `isOverdue` é recalculado localmente. Uma tarefa concluída não está
 *    atrasada, e sem isso o rótulo vermelho ficaria na tela até a revalidação.
 *
 * 2. Listas FILTRADAS por status têm o item removido. O filtro está na própria
 *    query key, então é possível saber que numa lista "Pendente" a tarefa que
 *    acabou de virar "Concluída" não pertence mais - em vez de deixá-la visível
 *    até o invalidate chegar.
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

      removeTaskFromLists(queryClient, taskId)

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

  const status = (filters as TaskListFilters).status

  return status ?? null
}

function patchTaskInLists(
  queryClient: QueryClient,
  taskId: string,
  patch: (task: TaskDTO) => TaskDTO,
): void {
  const lists = queryClient.getQueriesData<ListResponse<TaskDTO>>({
    queryKey: queryKeys.tasks.lists(),
  })

  for (const [key, current] of lists) {
    if (!current) continue

    const index = current.data.findIndex((task) => task.id === taskId)
    if (index < 0) continue

    const existing = current.data[index]
    if (!existing) continue

    const updated = patch(existing)
    const statusFilter = statusFilterOf(key)

    // A tarefa deixou de casar com o filtro desta lista: sai dela.
    if (statusFilter && updated.status !== statusFilter) {
      queryClient.setQueryData<ListResponse<TaskDTO>>(key, {
        data: current.data.filter((task) => task.id !== taskId),
        meta: { ...current.meta, total: Math.max(0, current.meta.total - 1) },
      })
      continue
    }

    const next = [...current.data]
    next[index] = updated

    queryClient.setQueryData<ListResponse<TaskDTO>>(key, {
      ...current,
      data: next,
    })
  }
}

function removeTaskFromLists(queryClient: QueryClient, taskId: string): void {
  queryClient.setQueriesData<ListResponse<TaskDTO>>(
    { queryKey: queryKeys.tasks.lists() },
    (current) => {
      if (!current) return current
      if (!current.data.some((task) => task.id === taskId)) return current

      return {
        data: current.data.filter((task) => task.id !== taskId),
        meta: { ...current.meta, total: Math.max(0, current.meta.total - 1) },
      }
    },
  )
}
