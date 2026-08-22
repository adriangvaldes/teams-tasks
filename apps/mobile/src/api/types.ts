import type { PaginationMeta } from '@teams-tasks/shared'

export interface ItemResponse<TData> {
  data: TData
}

export interface ListResponse<TData> {
  data: TData[]
  meta: PaginationMeta
}
