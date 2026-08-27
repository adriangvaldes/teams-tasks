import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Alert, Text, View } from 'react-native'
import { ApiError } from '@/api/api-error'
import { TaskList } from '@/components/task-list'
import { Button } from '@/components/ui/button'
import { Fab } from '@/components/ui/fab'
import { ErrorState, LoadingState } from '@/components/ui/states'
import { useDeleteTeam, useTeam } from '@/hooks/use-teams'
import { readableTextColor, withAlpha } from '@/lib/color'

export default function TeamTasksScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const query = useTeam(id)
  const deleteTeam = useDeleteTeam()

  if (query.isPending) return <LoadingState label="Carregando time…" />

  if (query.isError) {
    const isNotFound = query.error instanceof ApiError && query.error.isNotFound

    return (
      <ErrorState
        message={
          isNotFound
            ? 'Este time não existe mais.'
            : query.error instanceof ApiError
              ? query.error.userMessage
              : 'Erro inesperado ao carregar o time.'
        }
        onRetry={isNotFound ? undefined : () => void query.refetch()}
      />
    )
  }

  const team = query.data.data

  const confirmDelete = (): void => {
    Alert.alert(
      'Excluir time',
      `"${team.name}" será removido. As tarefas continuam existindo, apenas sem este time.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteTeam.mutate(team.id, {
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
    <View className="flex-1 bg-canvas">
      <Stack.Screen options={{ title: team.name }} />

      <View
        style={{ backgroundColor: withAlpha(team.colorHex, 0.12) }}
        className="gap-3 px-4 pb-4 pt-3"
      >
        <View className="flex-row items-start gap-3">
          <View
            style={{ backgroundColor: team.colorHex }}
            className="h-10 w-10 items-center justify-center rounded-xl"
          >
            <Text
              style={{ color: readableTextColor(team.colorHex) }}
              className="text-base font-bold"
            >
              {team.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View className="flex-1 gap-0.5">
            <Text className="text-lg font-semibold text-ink">{team.name}</Text>

            {team.description ? (
              <Text className="text-sm text-ink-muted">{team.description}</Text>
            ) : null}

            <Text className="text-xs text-ink-muted">
              {team.taskCount === 1
                ? '1 tarefa vinculada'
                : `${team.taskCount} tarefas vinculadas`}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              label="Editar"
              variant="secondary"
              size="sm"
              onPress={() => router.push(`/teams/${team.id}/edit`)}
              fullWidth
            />
          </View>
          <View className="flex-1">
            <Button
              label="Excluir"
              variant="danger"
              size="sm"
              onPress={confirmDelete}
              loading={deleteTeam.isPending}
              fullWidth
            />
          </View>
        </View>
      </View>

      <TaskList
        teamId={team.id}
        emptyTitle="Nenhuma tarefa neste time"
        emptyDescription="Crie uma tarefa já vinculada a este time."
      />

      <Fab
        label="Nova tarefa neste time"
        onPress={() => router.push(`/tasks/new?teamId=${team.id}`)}
      />
    </View>
  )
}
