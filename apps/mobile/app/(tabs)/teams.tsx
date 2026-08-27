import { Link, Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { TeamCard } from '@/components/team-card'
import { Fab } from '@/components/ui/fab'
import { PaginatedList } from '@/components/ui/paginated-list'
import { SearchField } from '@/components/ui/search-field'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { flattenTeamPages, useTeams } from '@/hooks/use-teams'

function pluralizeTeams(total: number): string {
  return total === 1 ? '1 time' : `${total} times`
}

export default function TeamsScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const trimmedSearch = debouncedSearch.trim()

  const query = useTeams({
    search: trimmedSearch || undefined,
    sort: 'name:asc',
  })

  const { teams, total } = flattenTeamPages(query.data)

  return (
    <View className="flex-1 bg-canvas">
      <Stack.Screen options={{ title: 'Times' }} />

      <View className="border-b border-border bg-surface px-4 pb-3 pt-2">
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar time"
        />
      </View>

      <PaginatedList
        query={query}
        items={teams}
        total={total}
        keyExtractor={(team) => team.id}
        countLabel={pluralizeTeams}
        loadingLabel="Carregando times…"
        errorFallback="Erro inesperado ao carregar os times."
        isFiltered={trimmedSearch !== ''}
        emptyTitle="Nenhum time ainda"
        emptyDescription="Crie um time para organizar as tarefas."
        filteredEmptyTitle="Nenhum time encontrado"
        filteredEmptyDescription="Tente outro termo de busca."
        emptyActionLabel="Novo time"
        onEmptyAction={() => router.push('/teams/new')}
        renderItem={(team) => (
          <TeamCard
            team={team}
            onPress={() => router.push(`/teams/${team.id}`)}
          />
        )}
      />

      <Link href="/teams/new" asChild>
        <Fab label="Novo time" />
      </Link>
    </View>
  )
}
