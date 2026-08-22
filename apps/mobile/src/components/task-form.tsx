import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Text, View } from 'react-native'
import { ApiError } from '@/api/api-error'
import {
  EMPTY_TASK_FORM,
  type TaskFormValues,
  taskFormSchema,
} from '@/forms/task-form.schema'
import { maskDateInput } from '@/lib/format'
import { StatusSelector } from './status-selector'
import { TeamSelector } from './team-selector'
import { Button } from './ui/button'
import { TextField } from './ui/text-field'

interface TaskFormProps {
  defaultValues?: TaskFormValues
  submitLabel: string
  isSubmitting: boolean
  submitError?: unknown
  onSubmit: (values: TaskFormValues) => void
  onCancel: () => void
}

export function TaskForm({
  defaultValues = EMPTY_TASK_FORM,
  submitLabel,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,

    mode: 'onBlur',
  })

  useEffect(() => {
    if (!(submitError instanceof ApiError)) return

    for (const [path, message] of Object.entries(submitError.fieldErrors)) {
      if (path in EMPTY_TASK_FORM) {
        setError(path as keyof TaskFormValues, { type: 'server', message })
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
        name="title"
        render={({ field }) => (
          <TextField
            label="Título"
            required
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="Ex.: Implementar tela de listagem"
            error={errors.title?.message}
            autoFocus={!defaultValues.title}
          />
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
            placeholder="Detalhes da tarefa (opcional)"
            error={errors.description?.message}
            multiline
            numberOfLines={4}
            className="min-h-[96px] rounded-xl border border-border bg-surface px-4 py-3 text-base text-ink"
            textAlignVertical="top"
          />
        )}
      />

      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <StatusSelector value={field.value} onChange={field.onChange} />
        )}
      />

      <Controller
        control={control}
        name="dueDate"
        render={({ field }) => (
          <TextField
            label="Prazo"
            value={field.value}
            onChangeText={(text) => field.onChange(maskDateInput(text))}
            onBlur={field.onBlur}
            placeholder="dd/mm/aaaa"
            keyboardType="number-pad"
            maxLength={10}
            error={errors.dueDate?.message}
            hint="Deixe em branco para tarefa sem prazo"
          />
        )}
      />

      <Controller
        control={control}
        name="teamIds"
        render={({ field }) => (
          <TeamSelector
            selectedIds={field.value}
            onChange={field.onChange}
            error={errors.teamIds?.message}
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
