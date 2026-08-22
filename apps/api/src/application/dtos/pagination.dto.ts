export interface PaginationCriteria {
  limit: number
  offset: number
}

export interface SortCriteria<TField extends string> {
  field: TField
  direction: 'asc' | 'desc'
}

export interface PaginatedResult<TItem> {
  items: TItem[]
  total: number
}

export interface PaginatedOutput<TItem> extends PaginationCriteria {
  items: TItem[]
  total: number
}
