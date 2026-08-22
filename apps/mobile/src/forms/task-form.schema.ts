import {
  type CreateTaskBody,
  taskStatusSchema,
  taskTitleSchema,
  type UpdateTaskBody,
} from '@teams-tasks/shared'
import { z } from 'zod'
import { parseDateInput } from '@/lib/format'

export const taskFormSchema = z.object({
  title: taskTitleSchema,

  description: z
    .string()
    .trim()
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres'),

  status: taskStatusSchema,

  dueDate: z
    .string()
    .trim()
    .refine((value) => value === '' || parseDateInput(value) !== null, {
      message: 'Use o formato dd/mm/aaaa',
    }),

  teamIds: z.array(z.uuid()),
})

export type TaskFormValues = z.infer<typeof taskFormSchema>

export const EMPTY_TASK_FORM: TaskFormValues = {
  title: '',
  description: '',
  status: 'PENDING',
  dueDate: '',
  teamIds: [],
}

export function toTaskBody(
  values: TaskFormValues,
): CreateTaskBody & UpdateTaskBody {
  return {
    title: values.title,

    description: values.description === '' ? null : values.description,
    status: values.status,
    dueDate: values.dueDate === '' ? null : parseDateInput(values.dueDate),
    teamIds: values.teamIds,
  }
}
