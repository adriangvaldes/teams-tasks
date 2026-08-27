import { Pressable, Text, View } from 'react-native'
import { readableTextColor } from '@/lib/color'

export interface ActiveFilter {
  key: string
  label: string
  color?: string | undefined
  onRemove: () => void
}

interface TaskFilterBarProps {
  activeFilters: ActiveFilter[]
  onOpen: () => void
}

export function TaskFilterBar({ activeFilters, onOpen }: TaskFilterBarProps) {
  const count = activeFilters.length

  return (
    <View className="flex-row flex-wrap items-center gap-2 px-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          count === 0 ? 'Abrir filtros' : `Abrir filtros, ${count} ativo(s)`
        }
        onPress={onOpen}
        className={[
          'h-9 flex-row items-center gap-2 rounded-full border px-4',
          count > 0
            ? 'border-brand-600 bg-brand-50'
            : 'border-border bg-surface active:bg-canvas',
        ].join(' ')}
      >
        <Text
          className={[
            'text-sm font-medium',
            count > 0 ? 'text-brand-700' : 'text-ink-muted',
          ].join(' ')}
        >
          Filtros
        </Text>

        {count > 0 ? (
          <View className="h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5">
            <Text className="text-xs font-bold text-white">{count}</Text>
          </View>
        ) : null}
      </Pressable>

      {activeFilters.map((filter) => (
        <Pressable
          key={filter.key}
          accessibilityRole="button"
          accessibilityLabel={`Remover filtro ${filter.label}`}
          onPress={filter.onRemove}
          style={
            filter.color
              ? { backgroundColor: filter.color, borderColor: filter.color }
              : undefined
          }
          className={[
            'h-9 flex-row items-center gap-1.5 rounded-full border px-3.5',
            filter.color ? '' : 'border-brand-600 bg-brand-600',
          ].join(' ')}
        >
          <Text
            numberOfLines={1}
            style={
              filter.color
                ? { color: readableTextColor(filter.color) }
                : undefined
            }
            className={[
              'max-w-40 text-sm font-medium',
              filter.color ? '' : 'text-white',
            ].join(' ')}
          >
            {filter.label}
          </Text>

          <Text
            style={
              filter.color
                ? { color: readableTextColor(filter.color) }
                : undefined
            }
            className={['text-sm', filter.color ? '' : 'text-white'].join(' ')}
          >
            ×
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
