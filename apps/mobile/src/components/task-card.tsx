import type { TaskDTO } from '@teams-tasks/shared'
import { Pressable, Text, View } from 'react-native'
import { formatDueDateLabel } from '@/lib/format'
import { StatusBadge } from './status-badge'
import { TeamChipList } from './team-chip'

interface TaskCardProps {
  task: TaskDTO
  onPress: () => void
  onToggleStatus: () => void
  isUpdating?: boolean
}

export function TaskCard({
  task,
  onPress,
  onToggleStatus,
  isUpdating = false,
}: TaskCardProps) {
  const isDone = task.status === 'DONE'
  const dueLabel = formatDueDateLabel(task.dueDate, { isDone })

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Tarefa ${task.title}`}
      accessibilityHint="Toque para ver os detalhes"
      className={[
        'flex-row gap-3 rounded-2xl border border-border bg-surface p-4 active:bg-canvas',

        isUpdating ? 'opacity-60' : '',
      ].join(' ')}
    >
      <Pressable
        onPress={onToggleStatus}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isDone }}
        accessibilityLabel={
          isDone
            ? `Reabrir tarefa ${task.title}`
            : `Avançar status da tarefa ${task.title}`
        }
        className={[
          'mt-0.5 h-6 w-6 items-center justify-center rounded-full border-2',
          isDone ? 'border-emerald-500 bg-emerald-500' : 'border-border',
        ].join(' ')}
      >
        {isDone ? (
          <Text className="text-xs font-bold text-white">✓</Text>
        ) : null}
      </Pressable>

      <View className="flex-1 gap-2">
        <Text
          numberOfLines={2}
          className={[
            'text-base font-semibold',
            isDone ? 'text-ink-muted line-through' : 'text-ink',
          ].join(' ')}
        >
          {task.title}
        </Text>

        {task.description ? (
          <Text numberOfLines={2} className="text-sm text-ink-muted">
            {task.description}
          </Text>
        ) : null}

        <View className="flex-row flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />

          {dueLabel ? (
            <Text
              className={[
                'text-xs',
                task.isOverdue
                  ? 'font-semibold text-red-600'
                  : 'text-ink-muted',
              ].join(' ')}
            >
              {dueLabel}
            </Text>
          ) : null}
        </View>

        <TeamChipList teams={task.teams} />
      </View>
    </Pressable>
  )
}
