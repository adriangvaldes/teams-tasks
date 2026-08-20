import type {
  CreateTaskBody,
  TaskDTO,
  TaskSortOption,
  TaskStatusValue,
  UpdateTaskBody,
} from '@teams-tasks/shared'
import { buildQueryString, httpClient } from './http-client'
import type { ItemResponse, ListResponse } from './types'

export interface TaskListFilters {
  teamId?: string | undefined
  status?: TaskStatusValue | undefined
  search?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
  sort?: TaskSortOption | undefined
}

const BASE_PATH = '/api/tasks'

export const tasksApi = {
  list: (filters: TaskListFilters, signal?: AbortSignal) =>
    httpClient.get<ListResponse<TaskDTO>>(
      `${BASE_PATH}${buildQueryString({ ...filters })}`,
      signal,
    ),

  detail: (taskId: string, signal?: AbortSignal) =>
    httpClient.get<ItemResponse<TaskDTO>>(`${BASE_PATH}/${taskId}`, signal),

  create: (body: CreateTaskBody) =>
    httpClient.post<ItemResponse<TaskDTO>>(BASE_PATH, body),

  update: (taskId: string, body: UpdateTaskBody) =>
    httpClient.put<ItemResponse<TaskDTO>>(`${BASE_PATH}/${taskId}`, body),

  /** Acao rapida: endpoint dedicado, payload minimo, ideal para optimistic update. */
  changeStatus: (taskId: string, status: TaskStatusValue) =>
    httpClient.patch<ItemResponse<TaskDTO>>(`${BASE_PATH}/${taskId}/status`, {
      status,
    }),

  remove: (taskId: string) => httpClient.delete(`${BASE_PATH}/${taskId}`),
} as const
