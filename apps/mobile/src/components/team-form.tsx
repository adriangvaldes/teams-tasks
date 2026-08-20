import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, Text, View } from 'react-native'
import { ApiError } from '@/api/api-error'
import {
  EMPTY_TEAM_FORM,
  TEAM_COLOR_PRESETS,
  type TeamFormValues,
  teamFormSchema,
} from '@/forms/team-form.schema'
import { readableTextColor } from '@/lib/color'
import { Button } from './ui/button'
import { TextField } from './ui/text-field'

interface TeamFormProps {
  defaultValues?: TeamFormValues
  submitLabel: string
  isSubmitting: boolean
  submitError?: unknown
  onSubmit: (values: TeamFormValues) => void
  onCancel: () => void
}

export function TeamForm({
  defaultValues = EMPTY_TEAM_FORM,
  submitLabel,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
}: TeamFormProps) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues,
    mode: 'onBlur',
  })

  useEffect(() => {
    if (!(submitError instanceof ApiError)) return

    for (const [path, message] of Object.entries(submitError.fieldErrors)) {
      if (path in EMPTY_TEAM_FORM) {
        setError(path as keyof TeamFormValues, { type: 'server', message })
      }
    }
  }, [submitError, setError])

  const generalError =
    submitError instanceof ApiError &&
    Object.keys(submitError.fieldErrors).length === 0
      ? submitError.userMessage
      : null

  return (
    <View className="gap-5">
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField
            label="Nome"
            required
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="Ex.: Squad Alpha"
            error={errors.name?.message}
            autoFocus={!defaultValues.name}
          />
        )}
      />

      <Controller
        control={control}
        name="colorHex"
        render={({ field }) => (
          <View className="gap-3">
            {/* Paleta como atalho, campo de texto como escape: o contrato
                aceita qualquer #RRGGBB, então a UI não deve limitar a oito. */}
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-ink">Cor do time</Text>
              <View className="flex-row flex-wrap gap-2">
                {TEAM_COLOR_PRESETS.map((preset) => {
                  const isSelected =
                    field.value.toUpperCase() === preset.toUpperCase()

                  return (
                    <Pressable
                      key={preset}
                      onPress={() => field.onChange(preset)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Cor ${preset}`}
                      style={{ backgroundColor: preset }}
                      className={[
                        'h-10 w-10 items-center justify-center rounded-full',
                        isSelected ? 'border-2 border-ink' : '',
                      ].join(' ')}
                    >
                      {isSelected ? (
                        <Text
                          style={{ color: readableTextColor(preset) }}
                          className="text-xs font-bold"
                        >
                          ✓
                        </Text>
                      ) : null}
                    </Pressable>
                  )
                })}
              </View>
            </View>

            <TextField
              label="Hexadecimal"
              value={field.value}
              onChangeText={(text) => field.onChange(text.toUpperCase())}
              onBlur={field.onBlur}
              placeholder="#2563EB"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
              error={errors.colorHex?.message}
            />
          </View>
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            label="Descrição"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="O que este time faz (opcional)"
            error={errors.description?.message}
            multiline
            numberOfLines={3}
            className="min-h-[80px] rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink"
            textAlignVertical="top"
          />
        )}
      />

      {generalError ? (
        <View className="rounded-xl border border-red-200 bg-red-50 p-3">
          <Text className="text-sm text-red-700">{generalError}</Text>
        </View>
      ) : null}

      <View className="flex-row gap-3 pt-2">
        <View className="flex-1">
          <Button
            label="Cancelar"
            variant="secondary"
            onPress={onCancel}
            disabled={isSubmitting}
            fullWidth
          />
        </View>
        <View className="flex-1">
          <Button
            label={submitLabel}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            fullWidth
          />
        </View>
      </View>
    </View>
  )
}
