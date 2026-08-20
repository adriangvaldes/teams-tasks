export interface PaginationCriteria {
  limit: number
  offset: number
}

export interface SortCriteria<TField extends string> {
  field: TField
  direction: 'asc' | 'desc'
}

/** Resultado de qualquer listagem: a pagina + o total para montar o `meta`. */
export interface PaginatedResult<TItem> {
  items: TItem[]
  total: number
}

/** Saida de qualquer use case de listagem: a pagina + o eco da paginacao. */
export interface PaginatedOutput<TItem> extends PaginationCriteria {
  items: TItem[]
  total: number
}
