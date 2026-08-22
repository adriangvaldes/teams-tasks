import type { TaskStatusValue } from '@teams-tasks/shared'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { ApiError } from '@/api/api-error'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import {
  flattenTaskPages,
  useChangeTaskStatus,
  useTasks,
} from '@/hooks/use-tasks'
import { cycleStatus } from '@/lib/task-status'
import { TaskCard } from './task-card'
import { FilterChips, type FilterOption } from './ui/filter-chips'
import { PaginatedList } from './ui/paginated-list'
import { SearchField } from './ui/search-field'

const STATUS_FILTERS: FilterOption<TaskStatusValue>[] = [
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

  const debouncedSearch = useDebouncedValue(search)
  const trimmedSearch = debouncedSearch.trim()

  const query = useTasks({
    teamId,
    status: status ?? undefined,
    search: trimmedSearch || undefined,
    sort: 'createdAt:desc',
  })

  const changeStatus = useChangeTaskStatus()
  const { tasks, total } = flattenTaskPages(query.data)

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
            error instanceof ApiError
              ? error.userMessage
              : 'Tente novamente em instantes.',
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

        <FilterChips
          options={STATUS_FILTERS}
          selected={status}
          onSelect={setStatus}
          accessibilityLabel="Filtrar por status"
        />
      </View>

      <PaginatedList
        query={query}
        items={tasks}
        total={total}
        keyExtractor={(task) => task.id}
        countLabel={pluralizeTasks}
        loadingLabel="Carregando tarefas…"
        errorFallback="Erro inesperado ao carregar as tarefas."
        isFiltered={status !== null || trimmedSearch !== ''}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        filteredEmptyTitle="Nada encontrado"
        filteredEmptyDescription="Tente outro termo de busca ou remova o filtro de status."
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
