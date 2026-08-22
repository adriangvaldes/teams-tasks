import { Pressable, Text, TextInput, View } from 'react-native'

interface SearchFieldProps {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
}

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Buscar…',
}: SearchFieldProps) {
  return (
    <View className="flex-row items-center gap-2 rounded-xl border border-border bg-surface px-4">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        accessibilityLabel={placeholder}
        autoCorrect={false}
        returnKeyType="search"
        className="flex-1 py-3 text-base text-ink"
      />

      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpar busca"
          onPress={() => onChangeText('')}
          hitSlop={12}
        >
          <Text className="text-lg text-ink-subtle">×</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
