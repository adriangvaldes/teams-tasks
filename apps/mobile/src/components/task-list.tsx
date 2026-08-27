import type { TaskStatusValue } from '@teams-tasks/shared'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  flattenTaskPages,
  useChangeTaskStatus,
  useTasks,
} from '@/hooks/use-tasks'
import { useTeamOptions } from '@/hooks/use-teams'
import { messageFromError } from '@/lib/error-message'
import { cycleStatus } from '@/lib/task-status'
import { TaskCard } from './task-card'
import { type ActiveFilter, TaskFilterBar } from './task-filter-bar'
import { type StatusOption, TaskFilterSheet } from './task-filter-sheet'
import { PaginatedList } from './ui/paginated-list'
import { SearchField } from './ui/search-field'

const STATUS_OPTIONS: StatusOption[] = [
  { value: null, label: 'Todas' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'IN_PROGRESS', label: 'Em progresso' },
  { value: 'DONE', label: 'Concluídas' },
]

function pluralizeTasks(total: number): string {
  return total === 1 ? '1 tarefa' : `${total} tarefas`
}

interface TaskListProps {
  teamId?: string
  emptyTitle?: string
  emptyDescription?: string
}

export function TaskList({
  teamId,
  emptyTitle = 'Nenhuma tarefa por aqui',
  emptyDescription = 'Crie a primeira tarefa para começar.',
}: TaskListProps) {
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TaskStatusValue | null>(null)
  const [team, setTeam] = useState<string | null>(null)
  const [isSheetOpen, setSheetOpen] = useState(false)

  const debouncedSearch = useDebouncedValue(search)
  const trimmedSearch = debouncedSearch.trim()

  const isTeamScoped = teamId !== undefined
  const selectedTeam = isTeamScoped ? null : team

  const query = useTasks({
    teamId: teamId ?? selectedTeam ?? undefined,
    status: status ?? undefined,
    search: trimmedSearch || undefined,
    sort: 'createdAt:desc',
  })

  const changeStatus = useChangeTaskStatus()
  const { tasks, total } = flattenTaskPages(query.data)

  const teamOptions = useTeamOptions()
  const teams = isTeamScoped ? [] : (teamOptions.data?.data ?? [])
  const selectedTeamName = teams.find((option) => option.id === selectedTeam)

  const activeFilters: ActiveFilter[] = []

  if (status !== null) {
    activeFilters.push({
      key: 'status',
      label:
        STATUS_OPTIONS.find((option) => option.value === status)?.label ?? '',
      onRemove: () => setStatus(null),
    })
  }

  if (selectedTeamName) {
    activeFilters.push({
      key: 'team',
      label: selectedTeamName.name,
      color: selectedTeamName.colorHex,
      onRemove: () => setTeam(null),
    })
  }

  const hasSheetFilters = activeFilters.length > 0
  const hasFilters = hasSheetFilters || trimmedSearch !== ''

  const clearSheetFilters = (): void => {
    setStatus(null)
    setTeam(null)
  }

  const handleToggleStatus = (
    taskId: string,
    current: TaskStatusValue,
  ): void => {
    changeStatus.mutate(
      { taskId, status: cycleStatus(current) },
      {
        onError: (error) =>
          Alert.alert(
            'Não foi possível alterar o status',
            messageFromError(error),
          ),
      },
    )
  }

  return (
    <View className="flex-1">
      <View className="gap-3 border-b border-border bg-surface pb-3 pt-2">
        <View className="px-4">
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por título ou descrição"
          />
        </View>

        <TaskFilterBar
          activeFilters={activeFilters}
          onOpen={() => setSheetOpen(true)}
        />
      </View>

      <TaskFilterSheet
        visible={isSheetOpen}
        onClose={() => setSheetOpen(false)}
        statusOptions={STATUS_OPTIONS}
        status={status}
        onStatusChange={setStatus}
        teams={teams}
        team={selectedTeam}
        onTeamChange={setTeam}
        hasFilters={hasSheetFilters}
        onClear={clearSheetFilters}
        resultLabel={`Ver ${pluralizeTasks(total)}`}
      />

      <PaginatedList
        query={query}
        items={tasks}
        total={total}
        keyExtractor={(task) => task.id}
        countLabel={pluralizeTasks}
        loadingLabel="Carregando tarefas…"
        errorFallback="Erro inesperado ao carregar as tarefas."
        isFiltered={hasFilters}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        filteredEmptyTitle="Nada encontrado"
        filteredEmptyDescription="Nenhuma tarefa combina com os filtros ativos."
        emptyActionLabel="Nova tarefa"
        onEmptyAction={() => router.push('/tasks/new')}
        renderItem={(task) => (
          <TaskCard
            task={task}
            onPress={() => router.push(`/tasks/${task.id}`)}
            onToggleStatus={() => handleToggleStatus(task.id, task.status)}
            isUpdating={
              changeStatus.isPending &&
              changeStatus.variables?.taskId === task.id
            }
          />
        )}
      />
    </View>
  )
}
