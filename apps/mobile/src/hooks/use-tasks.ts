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
      queryClient.setQueryData<ItemResponse<TaskDTO>>(
        queryKeys.tasks.detail(created.data.id),
        created,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() })

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

function statusFilterOf(
  queryKey: readonly unknown[],
): readonly TaskStatusValue[] | null {
  const filters = queryKey[queryKey.length - 1]

  if (typeof filters !== 'object' || filters === null) return null

  const status = (filters as TaskListFilters).status

  return status && status.length > 0 ? status : null
}

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
      (statusFilter !== null && !statusFilter.includes(updated.status))

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
