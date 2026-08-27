import { Link, Stack } from 'expo-router'
import { View } from 'react-native'
import { TaskList } from '@/components/task-list'
import { Fab } from '@/components/ui/fab'

export default function TasksScreen() {
  return (
    <View className="flex-1 bg-canvas">
      <Stack.Screen options={{ title: 'Tarefas' }} />

      <TaskList />

      <Link href="/tasks/new" asChild>
        <Fab label="Nova tarefa" />
      </Link>
    </View>
  )
}
