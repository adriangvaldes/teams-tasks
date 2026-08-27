import type { TaskStatusValue, TeamDTO } from '@teams-tasks/shared'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { readableTextColor, withAlpha } from '@/lib/color'
import { BottomSheet } from './ui/bottom-sheet'

export interface StatusOption {
  value: TaskStatusValue | null
  label: string
}

interface OptionChipProps {
  label: string
  isSelected: boolean
  onPress: () => void
  accessibilityLabel: string
  color?: string
}

function OptionChip({
  label,
  isSelected,
  onPress,
  accessibilityLabel,
  color,
}: OptionChipProps) {
  const tinted = color
    ? isSelected
      ? { backgroundColor: color, borderColor: color }
      : {
          backgroundColor: withAlpha(color, 0.1),
          borderColor: withAlpha(color, 0.4),
        }
    : undefined

  const tintedText = color
    ? { color: isSelected ? readableTextColor(color) : color }
    : undefined

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={tinted}
      className={[
        'h-10 justify-center rounded-full border px-4',
        color
          ? ''
          : isSelected
            ? 'border-brand-600 bg-brand-600'
            : 'border-border bg-surface active:bg-canvas',
      ].join(' ')}
    >
      <Text
        style={tintedText}
        className={[
          'text-sm font-medium',
          color ? '' : isSelected ? 'text-white' : 'text-ink-muted',
        ].join(' ')}
      >
        {label}
      </Text>
    </Pressable>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <View className="gap-2.5">
      <Text className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  )
}

interface TaskFilterSheetProps {
  visible: boolean
  onClose: () => void
  statusOptions: StatusOption[]
  status: TaskStatusValue | null
  onStatusChange: (status: TaskStatusValue | null) => void
  teams: TeamDTO[]
  team: string | null
  onTeamChange: (teamId: string | null) => void
  hasFilters: boolean
  onClear: () => void
  resultLabel: string
}

export function TaskFilterSheet({
  visible,
  onClose,
  statusOptions,
  status,
  onStatusChange,
  teams,
  team,
  onTeamChange,
  hasFilters,
  onClear,
  resultLabel,
}: TaskFilterSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel="Filtros de tarefas"
    >
      <View className="gap-5">
        <View className="flex-row items-center justify-between px-5">
          <Text className="text-lg font-semibold text-ink">Filtros</Text>

          {hasFilters ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpar filtros"
              onPress={onClear}
              className="h-9 justify-center"
            >
              <Text className="text-sm font-medium text-brand-600">Limpar</Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          className="max-h-96"
          contentContainerClassName="gap-6 px-5"
          showsVerticalScrollIndicator={false}
        >
          <Section title="Status">
            {statusOptions.map((option) => (
              <OptionChip
                key={option.value ?? 'all'}
                label={option.label}
                isSelected={option.value === status}
                onPress={() => onStatusChange(option.value)}
                accessibilityLabel={`Status ${option.label}`}
              />
            ))}
          </Section>

          {teams.length > 0 ? (
            <Section title="Time">
              <OptionChip
                label="Todos"
                isSelected={team === null}
                onPress={() => onTeamChange(null)}
                accessibilityLabel="Todos os times"
              />

              {teams.map((option) => (
                <OptionChip
                  key={option.id}
                  label={option.name}
                  color={option.colorHex}
                  isSelected={option.id === team}
                  onPress={() =>
                    onTeamChange(option.id === team ? null : option.id)
                  }
                  accessibilityLabel={`Time ${option.name}`}
                />
              ))}
            </Section>
          ) : null}
        </ScrollView>

        <View className="px-5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Aplicar filtros"
            onPress={onClose}
            className="items-center justify-center rounded-2xl bg-brand-600 active:bg-brand-700"
            style={{
              height: 52,
              shadowColor: '#2563EB',
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Text className="text-base font-semibold text-white">
              {resultLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  )
}
