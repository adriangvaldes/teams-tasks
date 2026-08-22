import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Alert, Text, View } from 'react-native'
import { ApiError } from '@/api/api-error'
import { StatusSelector } from '@/components/status-selector'
import { TeamChip } from '@/components/team-chip'
import { Button } from '@/components/ui/button'
import { FormScreen } from '@/components/ui/form-screen'
import { ErrorState, LoadingState } from '@/components/ui/states'
import { useChangeTaskStatus, useDeleteTask, useTask } from '@/hooks/use-tasks'
import { formatDate, formatDueDateLabel } from '@/lib/format'

export default function TaskDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const query = useTask(id)
  const changeStatus = useChangeTaskStatus()
  const deleteTask = useDeleteTask()

  if (query.isPending) return <LoadingState label="Carregando tarefa…" />

  if (query.isError) {
    const isNotFound = query.error instanceof ApiError && query.error.isNotFound

    return (
      <ErrorState
        message={
          isNotFound
            ? 'Esta tarefa não existe mais.'
            : query.error instanceof ApiError
              ? query.error.userMessage
              : 'Erro inesperado ao carregar a tarefa.'
        }
        onRetry={isNotFound ? undefined : () => void query.refetch()}
      />
    )
  }

  const task = query.data.data
  const dueLabel = formatDueDateLabel(task.dueDate, {
    isDone: task.status === 'DONE',
  })

  const confirmDelete = (): void => {
    Alert.alert(
      'Excluir tarefa',
      `"${task.title}" será removida permanentemente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteTask.mutate(task.id, {
              onSuccess: () => router.back(),
              onError: (error) => {
                Alert.alert(
                  'Não foi possível excluir',
                  error instanceof ApiError
                    ? error.userMessage
                    : 'Tente novamente em instantes.',
                )
              },
            })
          },
        },
      ],
    )
  }

  return (
    <FormScreen>
      <Stack.Screen options={{ title: 'Tarefa' }} />

      <View className="gap-6">
        <View className="gap-2">
          <Text className="text-2xl font-semibold text-ink">{task.title}</Text>

          {dueLabel ? (
            <Text
              className={
                task.isOverdue
                  ? 'text-sm font-semibold text-red-600'
                  : 'text-sm text-ink-muted'
              }
            >
              {dueLabel}
            </Text>
          ) : (
            <Text className="text-sm text-ink-subtle">Sem prazo definido</Text>
          )}
        </View>

        <View className="rounded-2xl border border-border bg-surface p-4">
          <StatusSelector
            label="Alterar status"
            value={task.status}
            disabled={changeStatus.isPending}
            onChange={(status) => {
              changeStatus.mutate(
                { taskId: task.id, status },
                {
                  onError: (error) => {
                    Alert.alert(
                      'Não foi possível alterar o status',
                      error instanceof ApiError
                        ? error.userMessage
                        : 'Tente novamente em instantes.',
                    )
                  },
                },
              )
            }}
          />
        </View>

        {task.description ? (
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-ink">Descrição</Text>
            <Text className="text-base leading-6 text-ink-muted">
              {task.description}
            </Text>
          </View>
        ) : null}

        <View className="gap-2">
          <Text className="text-sm font-medium text-ink">Times</Text>

          {task.teams.length === 0 ? (
            <Text className="text-sm text-ink-subtle">
              Esta tarefa não está vinculada a nenhum time.
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {task.teams.map((team) => (
                <TeamChip key={team.id} team={team} />
              ))}
            </View>
          )}
        </View>

        <View className="gap-1 border-t border-border pt-4">
          <Text className="text-xs text-ink-subtle">
            Criada em {formatDate(task.createdAt)}
          </Text>
          <Text className="text-xs text-ink-subtle">
            Atualizada em {formatDate(task.updatedAt)}
          </Text>
        </View>

        <View className="gap-3">
          <Button
            label="Editar tarefa"
            onPress={() => router.push(`/tasks/${task.id}/edit`)}
            fullWidth
          />
          <Button
            label="Excluir tarefa"
            variant="danger"
            onPress={confirmDelete}
            loading={deleteTask.isPending}
            fullWidth
          />
        </View>
      </View>
    </FormScreen>
  )
}
