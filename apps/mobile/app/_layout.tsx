import '../global.css'

import { focusManager } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { AppState, type AppStateStatus, Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { createQueryClient } from '@/lib/query-client'
import { appStorage } from '@/storage'
import { createQueryPersister } from '@/storage/query-persister'

/**
 * O React Query nasceu na web e, por padrão, usa eventos de foco do DOM que
 * não existem em React Native. Sem esta ponte, voltar do background não
 * revalida nada.
 */
function useAppStateFocus(): void {
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (status: AppStateStatus) => {
        if (Platform.OS === 'web') return

        focusManager.setFocused(status === 'active')
      },
    )

    return () => subscription.remove()
  }, [])
}

export default function RootLayout() {
  // Criado uma única vez: um QueryClient novo a cada render descartaria todo
  // o cache em qualquer re-render do layout.
  const [queryClient] = useState(createQueryClient)
  const [persister] = useState(() => createQueryPersister(appStorage))

  useAppStateFocus()

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <SafeAreaProvider>
        <StatusBar style="dark" />

        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTitleStyle: { color: '#0F172A', fontWeight: '600' },
            headerShadowVisible: false,
            headerTintColor: '#2563EB',
            contentStyle: { backgroundColor: '#F5F7FA' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          <Stack.Screen
            name="tasks/new"
            options={{ title: 'Nova tarefa', presentation: 'modal' }}
          />
          <Stack.Screen name="tasks/[id]/index" options={{ title: 'Tarefa' }} />
          <Stack.Screen
            name="tasks/[id]/edit"
            options={{ title: 'Editar tarefa' }}
          />

          <Stack.Screen
            name="teams/new"
            options={{ title: 'Novo time', presentation: 'modal' }}
          />
          <Stack.Screen name="teams/[id]/index" options={{ title: 'Time' }} />
          <Stack.Screen
            name="teams/[id]/edit"
            options={{ title: 'Editar time' }}
          />
        </Stack>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  )
}
