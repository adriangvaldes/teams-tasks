import { z } from 'zod'

export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export interface PaginationMeta {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export function buildPaginationMeta(
  total: number,
  { limit, offset }: PaginationQuery,
): PaginationMeta {
  return { total, limit, offset, hasMore: offset + limit < total }
}

export function parseSort<TField extends string>(
  sort: `${TField}:${'asc' | 'desc'}`,
): { field: TField; direction: 'asc' | 'desc' } {
  const [field, direction] = sort.split(':') as [TField, 'asc' | 'desc']
  return { field, direction }
}
