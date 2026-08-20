import type { ReactElement } from 'react'
import { ActivityIndicator, FlatList, Text, View } from 'react-native'
import { ApiError } from '@/api/api-error'
import { EmptyState, ErrorState, LoadingState } from './states'

/**
 * Subconjunto de UseInfiniteQueryResult de que a lista realmente precisa.
 *
 * Tipar assim (em vez de importar o tipo do React Query) mantém o componente
 * independente da biblioteca de data fetching e deixa o teste passar um objeto
 * literal, sem montar um QueryClient.
 */
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
  /** Total do conjunto FILTRADO, vindo do meta da API (não o tamanho da página). */
  total: number
  keyExtractor: (item: TItem) => string
  renderItem: (item: TItem) => ReactElement
  countLabel: (total: number) => string
  loadingLabel: string
  errorFallback: string
  /** Há busca ou filtro ativo? Muda a mensagem do estado vazio. */
  isFiltered: boolean
  emptyTitle: string
  emptyDescription: string
  filteredEmptyTitle: string
  filteredEmptyDescription: string
  emptyActionLabel?: string
  onEmptyAction?: () => void
}

/**
 * Lista paginada com busca, pull-to-refresh, "carregar mais" ao chegar no fim e
 * os três estados (carregando, erro, vazio).
 *
 * Extraído porque a lista de tarefas e a de times faziam exatamente isto, com o
 * mesmo tratamento de erro e a mesma lógica de página — duplicado.
 */
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
      // flexGrow permite o estado vazio ocupar a tela inteira e ficar centrado.
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
      // Sem o segundo termo, buscar a próxima página acionaria o spinner de
      // refresh no topo além do do rodapé.
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={query.refetch}
      keyboardShouldPersistTaps="handled"
    />
  )
}
