import type { TaskStatusValue } from '@teams-tasks/shared'
import { Pressable, Text, View } from 'react-native'
import { STATUS_APPEARANCE, STATUS_OPTIONS } from '@/lib/task-status'

interface StatusSelectorProps {
  value: TaskStatusValue
  onChange: (status: TaskStatusValue) => void
  disabled?: boolean
  label?: string
}

export function StatusSelector({
  value,
  onChange,
  disabled = false,
  label = 'Status',
}: StatusSelectorProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink">{label}</Text>

      <View accessibilityRole="radiogroup" className="flex-row gap-2">
        {STATUS_OPTIONS.map((option) => {
          const isSelected = option.value === value
          const appearance = STATUS_APPEARANCE[option.value]

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected, disabled }}
              accessibilityLabel={option.label}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              className={[
                'flex-1 items-center gap-1 rounded-xl border py-2.5',
                isSelected
                  ? `${appearance.badge} border-2`
                  : 'border-border bg-surface active:bg-canvas',
                disabled ? 'opacity-50' : '',
              ].join(' ')}
            >
              <View className={`h-2 w-2 rounded-full ${appearance.dot}`} />
              <Text
                numberOfLines={1}
                className={[
                  'text-xs font-medium',
                  isSelected ? appearance.text : 'text-ink-muted',
                ].join(' ')}
              >
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
