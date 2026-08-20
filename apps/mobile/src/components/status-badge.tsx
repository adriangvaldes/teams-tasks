import type { TaskStatusValue } from '@teams-tasks/shared'
import { Text, View } from 'react-native'
import { STATUS_APPEARANCE } from '@/lib/task-status'

export function StatusBadge({ status }: { status: TaskStatusValue }) {
  const appearance = STATUS_APPEARANCE[status]

  return (
    <View
      accessibilityLabel={`Status: ${appearance.label}`}
      className={`flex-row items-center gap-1.5 self-start rounded-full border px-2.5 py-1 ${appearance.badge}`}
    >
      {/* O ponto colorido não é decorativo: garante que o status seja
          distinguível também por forma, e não apenas por cor. */}
      <View className={`h-1.5 w-1.5 rounded-full ${appearance.dot}`} />
      <Text className={`text-xs font-medium ${appearance.text}`}>
        {appearance.label}
      </Text>
    </View>
  )
}
