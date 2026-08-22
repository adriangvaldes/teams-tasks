import type { ErrorBoundaryProps } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'
import { Button } from './ui/button'

export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <View className="flex-1 justify-center bg-canvas p-6">
      <View className="gap-4 rounded-2xl border border-border bg-surface p-6">
        <View className="gap-2">
          <Text className="text-xl font-semibold text-ink">
            A tela não pôde ser exibida
          </Text>
          <Text className="text-sm text-ink-muted">
            Algo quebrou ao montar esta tela. Tentar de novo costuma resolver;
            se persistir, feche e abra o aplicativo.
          </Text>
        </View>

        {isDevelopment ? (
          <ScrollView className="max-h-48 rounded-xl bg-canvas p-3">
            <Text className="text-xs text-red-600">{error.message}</Text>
            {error.stack ? (
              <Text className="mt-2 text-xs text-ink-subtle">
                {error.stack}
              </Text>
            ) : null}
          </ScrollView>
        ) : null}

        <Button
          label="Tentar novamente"
          onPress={() => void retry()}
          fullWidth
        />
      </View>
    </View>
  )
}
