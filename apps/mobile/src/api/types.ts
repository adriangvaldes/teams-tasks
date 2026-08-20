import type { PaginationMeta } from '@teams-tasks/shared'

/**
 * Envelopes de resposta. Sao a contraparte exata do que os presenters da API
 * produzem - e os DTOs internos vem do pacote @teams-tasks/shared, entao o
 * contrato nao pode divergir sem quebrar a compilacao das duas pontas.
 */
export interface ItemResponse<TData> {
  data: TData
}

export interface ListResponse<TData> {
  data: TData[]
  meta: PaginationMeta
}
