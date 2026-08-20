import { z } from 'zod'

export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100

/**
 * Query params de paginacao. Usa coerce porque em HTTP tudo chega como string;
 * o schema e a fronteira onde `string` se torna `number`.
 */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

/** Metadata exigida pelo enunciado ao listar recursos. */
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

/** Helper de ordenacao: 'campo:direcao' -> { field, direction }. */
export function parseSort<TField extends string>(
  sort: `${TField}:${'asc' | 'desc'}`,
): { field: TField; direction: 'asc' | 'desc' } {
  const [field, direction] = sort.split(':') as [TField, 'asc' | 'desc']
  return { field, direction }
}
