import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'

/**
 * Casca das telas de formulário.
 *
 * KeyboardAvoidingView com behavior por plataforma: no iOS o teclado cobre o
 * conteúdo se o container não for empurrado ('padding'); no Android o próprio
 * sistema redimensiona a janela, e usar 'padding' lá cria espaço duplicado.
 */
export function FormScreen({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-canvas"
    >
      <ScrollView
        contentContainerClassName="p-4 pb-10"
        keyboardShouldPersistTaps="handled"
        // Fecha o teclado ao arrastar a lista, comportamento esperado em mobile.
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
