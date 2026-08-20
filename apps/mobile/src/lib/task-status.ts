import type { TaskStatusValue } from '@teams-tasks/shared'
import { TASK_STATUSES } from '@teams-tasks/shared'

/**
 * Aparência de cada status. As classes ficam aqui, e não espalhadas nos
 * componentes, para que a lista, o badge e o seletor nunca discordem sobre a
 * cor de "Concluída".
 */
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

/**
 * Status do próximo toque na ação rápida. O ciclo é
 * Pendente -> Em Progresso -> Concluída -> Pendente, o que cobre o fluxo
 * normal com um toque e ainda permite desfazer sem abrir o seletor.
 */
export function cycleStatus(current: TaskStatusValue): TaskStatusValue {
  const order: TaskStatusValue[] = ['PENDING', 'IN_PROGRESS', 'DONE']
  const index = order.indexOf(current)

  return order[(index + 1) % order.length] ?? 'PENDING'
}
