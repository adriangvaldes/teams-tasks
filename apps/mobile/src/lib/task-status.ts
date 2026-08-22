import type { TaskStatusValue } from '@teams-tasks/shared'
import { TASK_STATUSES } from '@teams-tasks/shared'

export const STATUS_APPEARANCE: Record<
  TaskStatusValue,
  { label: string; badge: string; text: string; dot: string }
> = {
  PENDING: {
    label: 'Pendente',
    badge: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  IN_PROGRESS: {
    label: 'Em Progresso',
    badge: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  DONE: {
    label: 'Concluída',
    badge: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
}

export const STATUS_OPTIONS = TASK_STATUSES.map((status) => ({
  value: status,
  label: STATUS_APPEARANCE[status].label,
}))

export function cycleStatus(current: TaskStatusValue): TaskStatusValue {
  const order: TaskStatusValue[] = ['PENDING', 'IN_PROGRESS', 'DONE']
  const index = order.indexOf(current)

  return order[(index + 1) % order.length] ?? 'PENDING'
}
