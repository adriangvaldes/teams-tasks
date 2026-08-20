import { z } from 'zod'
import { paginationQuerySchema } from '../common/pagination'
import type { TeamSummaryDTO } from '../team/team.contracts'

export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE'] as const

export const taskStatusSchema = z.enum(TASK_STATUSES)
export type TaskStatusValue = (typeof TASK_STATUSES)[number]

/** Rotulos em pt-BR exigidos pela UI (Pendente | Em Progresso | Concluida). */
export const TASK_STATUS_LABELS: Record<TaskStatusValue, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Progresso',
  DONE: 'Concluida',
}

/** Requisito de aceitacao: titulo com no minimo 3 caracteres. */
export const taskTitleSchema = z
  .string()
  .trim()
  .min(3, 'Titulo deve ter ao menos 3 caracteres')
  .max(120, 'Titulo deve ter no maximo 120 caracteres')

export const taskDescriptionSchema = z
  .string()
  .trim()
  .max(2000, 'Descricao deve ter no maximo 2000 caracteres')

export const dueDateSchema = z.iso.datetime({
  offset: true,
  message: 'Data de vencimento deve ser uma data ISO 8601 valida',
})

/** Uma tarefa pode pertencer a zero ou mais times. */
export const teamIdsSchema = z
  .array(z.uuid('teamId deve ser um UUID valido'))
  .max(20, 'Uma tarefa pode ter no maximo 20 times')
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'Nao repita o mesmo time',
  })

// ---------- Entrada ----------

export const createTaskBodySchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema.optional(),
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

/** Acao rapida da tela de detalhe: alterar apenas o status. */
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

export const listTasksQuerySchema = paginationQuerySchema.extend({
  teamId: z.uuid('teamId deve ser um UUID valido').optional(),
  status: taskStatusSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(TASK_SORT_OPTIONS).default('createdAt:desc'),
})

export type CreateTaskBody = z.infer<typeof createTaskBodySchema>
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>
export type ChangeTaskStatusBody = z.infer<typeof changeTaskStatusBodySchema>
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>
export type TaskSortOption = (typeof TASK_SORT_OPTIONS)[number]

// ---------- Saida ----------

export interface TaskDTO {
  id: string
  title: string
  description: string | null
  status: TaskStatusValue
  dueDate: string | null
  /** Embutido de proposito: a lista de tarefas renderiza o chip sem request extra. */
  teams: TeamSummaryDTO[]
  /** Calculado no servidor para que cliente e API concordem sobre "atrasada". */
  isOverdue: boolean
  createdAt: string
  updatedAt: string
}
