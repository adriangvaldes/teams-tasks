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
import { toggleDone } from '@/lib/task-status'
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
  const [statuses, setStatuses] = useState<readonly TaskStatusValue[]>([])
  const [teamFilter, setTeamFilter] = useState<readonly string[]>([])
  const [isSheetOpen, setSheetOpen] = useState(false)

  const debouncedSearch = useDebouncedValue(search)
  const trimmedSearch = debouncedSearch.trim()

  const isTeamScoped = teamId !== undefined
  const selectedTeams = isTeamScoped ? [] : teamFilter

  const query = useTasks({
    teamId: isTeamScoped ? [teamId] : selectedTeams,
    status: statuses,
    search: trimmedSearch || undefined,
    sort: 'createdAt:desc',
  })

  const changeStatus = useChangeTaskStatus()
  const { tasks, total } = flattenTaskPages(query.data)

  const teamOptions = useTeamOptions()
  const teams = isTeamScoped ? [] : (teamOptions.data?.data ?? [])

  const activeFilters: ActiveFilter[] = [
    ...statuses.map((value) => ({
      key: `status:${value}`,
      label:
        STATUS_OPTIONS.find((option) => option.value === value)?.label ?? '',
      onRemove: () => toggleStatus(value),
    })),

    ...selectedTeams.flatMap((id) => {
      const team = teams.find((option) => option.id === id)
      if (!team) return []

      return [
        {
          key: `team:${id}`,
          label: team.name,
          color: team.colorHex,
          onRemove: () => toggleTeam(id),
        },
      ]
    }),
  ]

  const hasSheetFilters = statuses.length > 0 || selectedTeams.length > 0
  const hasFilters = hasSheetFilters || trimmedSearch !== ''

  function toggleStatus(value: TaskStatusValue | null): void {
    if (value === null) {
      setStatuses([])
      return
    }

    setStatuses((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    )
  }

  function toggleTeam(value: string | null): void {
    if (value === null) {
      setTeamFilter([])
      return
    }

    setTeamFilter((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    )
  }

  const clearSheetFilters = (): void => {
    setStatuses([])
    setTeamFilter([])
  }

  const handleToggleStatus = (
    taskId: string,
    current: TaskStatusValue,
  ): void => {
    changeStatus.mutate(
      { taskId, status: toggleDone(current) },
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
        statuses={statuses}
        onToggleStatus={toggleStatus}
        teams={teams}
        selectedTeams={selectedTeams}
        onToggleTeam={toggleTeam}
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
