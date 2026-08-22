import type { TeamDTO } from '@teams-tasks/shared'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useTeamOptions } from '@/hooks/use-teams'
import { readableTextColor, withAlpha } from '@/lib/color'

interface TeamOptionProps {
  team: TeamDTO
  isSelected: boolean
  onToggle: () => void
}

function TeamOption({ team, isSelected, onToggle }: TeamOptionProps) {
  const style = isSelected
    ? { backgroundColor: team.colorHex, borderColor: team.colorHex }
    : {
        backgroundColor: withAlpha(team.colorHex, 0.1),
        borderColor: withAlpha(team.colorHex, 0.4),
      }

  const textColor = isSelected
    ? readableTextColor(team.colorHex)
    : team.colorHex

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`Time ${team.name}`}
      style={style}
      className="flex-row items-center gap-1.5 rounded-full border px-3 py-2"
    >
      <Text style={{ color: textColor }} className="text-sm font-medium">
        {team.name}
      </Text>

      {isSelected ? (
        <Text style={{ color: textColor }} className="text-xs font-bold">
          ✓
        </Text>
      ) : null}
    </Pressable>
  )
}

interface TeamSelectorProps {
  selectedIds: string[]
  onChange: (teamIds: string[]) => void
  error?: string | undefined
}

export function TeamSelector({
  selectedIds,
  onChange,
  error,
}: TeamSelectorProps) {
  const { data, isPending, isError, refetch } = useTeamOptions()

  const toggle = (teamId: string): void => {
    onChange(
      selectedIds.includes(teamId)
        ? selectedIds.filter((id) => id !== teamId)
        : [...selectedIds, teamId],
    )
  }

  return (
    <View className="gap-1.5">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-sm font-medium text-ink">Times</Text>
        <Text className="text-xs text-ink-subtle">
          {selectedIds.length === 0
            ? 'Opcional'
            : `${selectedIds.length} selecionado${selectedIds.length > 1 ? 's' : ''}`}
        </Text>
      </View>

      <TeamOptionsBody
        teams={data?.data ?? []}
        isPending={isPending}
        isError={isError}
        onRetry={() => void refetch()}
        selectedIds={selectedIds}
        onToggle={toggle}
      />

      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  )
}

interface TeamOptionsBodyProps {
  teams: TeamDTO[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
  selectedIds: string[]
  onToggle: (teamId: string) => void
}

function TeamOptionsBody({
  teams,
  isPending,
  isError,
  onRetry,
  selectedIds,
  onToggle,
}: TeamOptionsBodyProps) {
  if (isPending) {
    return (
      <View className="h-12 items-center justify-center rounded-xl border border-border bg-surface">
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    )
  }

  if (isError) {
    return (
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        className="items-center justify-center rounded-xl border border-red-200 bg-red-50 p-3"
      >
        <Text className="text-center text-sm text-red-600">
          Não foi possível carregar os times. Toque para tentar de novo.
        </Text>
      </Pressable>
    )
  }

  if (teams.length === 0) {
    return (
      <View className="rounded-xl border border-border bg-surface p-3">
        <Text className="text-sm text-ink-muted">
          Nenhum time cadastrado ainda.
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {teams.map((team) => (
        <TeamOption
          key={team.id}
          team={team}
          isSelected={selectedIds.includes(team.id)}
          onToggle={() => onToggle(team.id)}
        />
      ))}
    </View>
  )
}
