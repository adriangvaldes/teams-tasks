import type { ReactElement } from 'react'
import { ActivityIndicator, FlatList, Text, View } from 'react-native'
import { ApiError } from '@/api/api-error'
import { EmptyState, ErrorState, LoadingState } from './states'

export interface InfiniteListQuery {
  isPending: boolean
  isError: boolean
  error: unknown
  isRefetching: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  refetch: () => void
  fetchNextPage: () => void
}

interface PaginatedListProps<TItem> {
  query: InfiniteListQuery
  items: TItem[]

  total: number
  keyExtractor: (item: TItem) => string
  renderItem: (item: TItem) => ReactElement
  countLabel: (total: number) => string
  loadingLabel: string
  errorFallback: string

  isFiltered: boolean
  emptyTitle: string
  emptyDescription: string
  filteredEmptyTitle: string
  filteredEmptyDescription: string
  emptyActionLabel?: string
  onEmptyAction?: () => void
}

export function PaginatedList<TItem>({
  query,
  items,
  total,
  keyExtractor,
  renderItem,
  countLabel,
  loadingLabel,
  errorFallback,
  isFiltered,
  emptyTitle,
  emptyDescription,
  filteredEmptyTitle,
  filteredEmptyDescription,
  emptyActionLabel,
  onEmptyAction,
}: PaginatedListProps<TItem>) {
  if (query.isPending) {
    return <LoadingState label={loadingLabel} />
  }

  if (query.isError) {
    return (
      <ErrorState
        message={
          query.error instanceof ApiError
            ? query.error.userMessage
            : errorFallback
        }
        onRetry={query.refetch}
      />
    )
  }

  const isEmpty = items.length === 0

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      contentContainerClassName="gap-3 p-4"
      contentContainerStyle={isEmpty ? { flexGrow: 1 } : undefined}
      ListHeaderComponent={
        isEmpty ? null : (
          <Text className="text-xs uppercase tracking-wide text-ink-subtle">
            {countLabel(total)}
            {isFiltered ? ' (filtrado)' : ''}
          </Text>
        )
      }
      ListEmptyComponent={
        <EmptyState
          title={isFiltered ? filteredEmptyTitle : emptyTitle}
          description={isFiltered ? filteredEmptyDescription : emptyDescription}
          {...(isFiltered || !emptyActionLabel || !onEmptyAction
            ? {}
            : { actionLabel: emptyActionLabel, onAction: onEmptyAction })}
        />
      }
      renderItem={({ item }) => renderItem(item)}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
          query.fetchNextPage()
        }
      }}
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View className="py-4">
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        ) : null
      }
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={query.refetch}
      keyboardShouldPersistTaps="handled"
    />
  )
}
