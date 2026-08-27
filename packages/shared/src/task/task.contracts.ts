import { z } from 'zod'
import { paginationQuerySchema } from '../common/pagination'
import type { TeamSummaryDTO } from '../team/team.contracts'

export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE'] as const

export const taskStatusSchema = z.enum(TASK_STATUSES)
export type TaskStatusValue = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatusValue, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Progresso',
  DONE: 'Concluída',
}

export const taskTitleSchema = z
  .string()
  .trim()
  .min(3, 'Título deve ter ao menos 3 caracteres')
  .max(120, 'Título deve ter no máximo 120 caracteres')

export const taskDescriptionSchema = z
  .string()
  .trim()
  .max(2000, 'Descrição deve ter no máximo 2000 caracteres')

export const dueDateSchema = z.iso.datetime({
  offset: true,
  message: 'Data de vencimento deve ser uma data ISO 8601 válida',
})

export const teamIdsSchema = z
  .array(z.uuid('teamId deve ser um UUID válido'))
  .max(20, 'Uma tarefa pode ter no máximo 20 times')
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'Não repita o mesmo time',
  })

export const createTaskBodySchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema.nullish(),
  status: taskStatusSchema.default('PENDING'),
  dueDate: dueDateSchema.nullish(),
  teamIds: teamIdsSchema.default([]),
})

export const updateTaskBodySchema = z
  .object({
    title: taskTitleSchema.optional(),
    description: taskDescriptionSchema.nullish(),
    status: taskStatusSchema.optional(),
    dueDate: dueDateSchema.nullish(),
    teamIds: teamIdsSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  })

export const changeTaskStatusBodySchema = z.object({
  status: taskStatusSchema,
})

export const TASK_SORT_OPTIONS = [
  'createdAt:asc',
  'createdAt:desc',
  'dueDate:asc',
  'dueDate:desc',
  'title:asc',
  'title:desc',
  'status:asc',
  'status:desc',
] as const

export const MAX_TEAM_FILTER = 20

function commaSeparated<TSchema extends z.ZodTypeAny>(item: TSchema) {
  return z.preprocess((value) => {
    if (value === undefined) return undefined

    const raw = Array.isArray(value) ? value : [value]

    const parts = raw
      .flatMap((entry) => String(entry).split(','))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)

    return parts.length > 0 ? [...new Set(parts)] : undefined
  }, z.array(item).optional())
}

export const listTasksQuerySchema = paginationQuerySchema.extend({
  teamId: commaSeparated(z.uuid('teamId deve ser um UUID válido')).pipe(
    z
      .array(z.string())
      .max(MAX_TEAM_FILTER, `Filtre por no máximo ${MAX_TEAM_FILTER} times`)
      .optional(),
  ),
  status: commaSeparated(taskStatusSchema),
  search: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(TASK_SORT_OPTIONS).default('createdAt:desc'),
})

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>
export type ChangeTaskStatusBody = z.infer<typeof changeTaskStatusBodySchema>
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>
export type TaskSortOption = (typeof TASK_SORT_OPTIONS)[number]

export interface TaskDTO {
  id: string
  title: string
  description: string | null
  status: TaskStatusValue
  dueDate: string | null

  teams: TeamSummaryDTO[]

  isOverdue: boolean
  createdAt: string
  updatedAt: string
}
