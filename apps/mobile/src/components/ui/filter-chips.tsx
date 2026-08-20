import { Pressable, ScrollView, Text } from 'react-native'

export interface FilterOption<TValue extends string> {
  value: TValue | null
  label: string
}

interface FilterChipsProps<TValue extends string> {
  options: FilterOption<TValue>[]
  selected: TValue | null
  onSelect: (value: TValue | null) => void
  accessibilityLabel: string
}

/**
 * Linha de filtros rolável horizontalmente. Usa `accessibilityState.selected`
 * em vez de só mudar a cor, para que o filtro ativo seja anunciado.
 */
export function FilterChips<TValue extends string>({
  options,
  selected,
  onSelect,
  accessibilityLabel,
}: FilterChipsProps<TValue>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={accessibilityLabel}
      contentContainerClassName="gap-2 px-4"
    >
      {options.map((option) => {
        const isSelected = option.value === selected

        return (
          <Pressable
            key={option.value ?? 'all'}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(option.value)}
            className={[
              'h-9 justify-center rounded-full border px-4',
              isSelected
                ? 'border-brand-600 bg-brand-600'
                : 'border-border bg-surface active:bg-canvas',
            ].join(' ')}
          >
            <Text
              className={[
                'text-sm font-medium',
                isSelected ? 'text-white' : 'text-ink-muted',
              ].join(' ')}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
