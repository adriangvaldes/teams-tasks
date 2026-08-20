import { Link, Stack } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { TaskList } from '@/components/task-list'

/** Lista GLOBAL de tarefas. A versão filtrada por time vive em /teams/[id]. */
export default function TasksScreen() {
  return (
    <View className="flex-1 bg-canvas">
      <Stack.Screen options={{ title: 'Tarefas' }} />

      <TaskList />

      {/* Botão flutuante: a ação principal da tela fica sempre ao alcance do
          polegar, mesmo com a lista rolada. */}
      <Link href="/tasks/new" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nova tarefa"
          className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-brand-600 active:bg-brand-700"
          style={{
            shadowColor: '#0F172A',
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <Text className="text-3xl leading-9 text-white">+</Text>
        </Pressable>
      </Link>
    </View>
  )
}
