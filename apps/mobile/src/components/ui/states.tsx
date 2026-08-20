import { ActivityIndicator, Text, View } from 'react-native'
import { Button } from './button'

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-8">
      <ActivityIndicator size="large" color="#2563EB" />
      <Text className="text-sm text-ink-muted">{label}</Text>
    </View>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-2 p-8">
      <Text className="text-center text-lg font-semibold text-ink">
        {title}
      </Text>

      {description ? (
        <Text className="text-center text-sm text-ink-muted">
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <View className="mt-3">
          <Button label={actionLabel} onPress={onAction} size="sm" />
        </View>
      ) : null}
    </View>
  )
}

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-8">
      <Text className="text-center text-lg font-semibold text-ink">
        Algo deu errado
      </Text>
      <Text className="text-center text-sm text-ink-muted">{message}</Text>

      {onRetry ? (
        <Button
          label="Tentar novamente"
          variant="secondary"
          size="sm"
          onPress={onRetry}
        />
      ) : null}
    </View>
  )
}
