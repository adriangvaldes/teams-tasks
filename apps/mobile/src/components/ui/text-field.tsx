import { forwardRef } from 'react'
import { Text, TextInput, type TextInputProps, View } from 'react-native'

interface TextFieldProps extends TextInputProps {
  label: string
  error?: string | undefined
  hint?: string | undefined
  required?: boolean
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  function TextField(
    { label, error, hint, required = false, ...inputProps },
    ref,
  ) {
    const hasError = Boolean(error)

    return (
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-ink">
          {label}
          {required ? <Text className="text-red-500"> *</Text> : null}
        </Text>

        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={hint}
          placeholderTextColor="#94A3B8"
          className={[
            'rounded-xl border bg-surface px-4 py-3 text-base text-ink',
            hasError ? 'border-red-400' : 'border-border',
          ].join(' ')}
          {...inputProps}
        />

        {hasError ? (
          <Text className="text-sm text-red-600">{error}</Text>
        ) : hint ? (
          <Text className="text-sm text-ink-muted">{hint}</Text>
        ) : null}
      </View>
    )
  },
)
