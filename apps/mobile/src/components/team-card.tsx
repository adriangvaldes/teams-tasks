import type { TeamDTO } from '@teams-tasks/shared'
import { Pressable, Text, View } from 'react-native'
import { withAlpha } from '@/lib/color'

interface TeamCardProps {
  team: TeamDTO
  onPress: () => void
}

export function TeamCard({ team, onPress }: TeamCardProps) {
  const taskLabel =
    team.taskCount === 1 ? '1 tarefa' : `${team.taskCount} tarefas`

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Time ${team.name}, ${taskLabel}`}
      accessibilityHint="Toque para ver as tarefas deste time"
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-4 active:bg-canvas"
    >
      {/* Marca de cor do time: fundo suave com a borda na cor cheia, para o
          time ser reconhecível de relance sem competir com o texto. */}
      <View
        style={{
          backgroundColor: withAlpha(team.colorHex, 0.15),
          borderColor: team.colorHex,
        }}
        className="h-11 w-11 items-center justify-center rounded-xl border-2"
      >
        <View
          style={{ backgroundColor: team.colorHex }}
          className="h-4 w-4 rounded-full"
        />
      </View>

      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-base font-semibold text-ink">
          {team.name}
        </Text>

        {team.description ? (
          <Text numberOfLines={1} className="text-sm text-ink-muted">
            {team.description}
          </Text>
        ) : null}

        <Text className="text-xs text-ink-subtle">{taskLabel}</Text>
      </View>

      <Text className="text-xl text-ink-subtle">›</Text>
    </Pressable>
  )
}
