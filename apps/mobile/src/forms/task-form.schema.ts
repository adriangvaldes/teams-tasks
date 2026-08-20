import {
  type CreateTaskBody,
  taskStatusSchema,
  taskTitleSchema,
  type UpdateTaskBody,
} from '@teams-tasks/shared'
import { z } from 'zod'
import { parseDateInput } from '@/lib/format'

/**
 * Schema do FORMULÁRIO, distinto do schema do corpo da requisição.
 *
 * O motivo é concreto: no formulário a data é um texto "dd/mm/aaaa" e um campo
 * vazio é `''`, não `null`. O contrato da API fala ISO 8601 e null. Misturar as
 * duas coisas em um schema só produziria validação confusa nos dois lados.
 *
 * O que NÃO é reimplementado aqui: as regras de campo. `taskTitleSchema` vem do
 * pacote compartilhado, então o mínimo de 3 caracteres é validado com a mesma
 * definição no formulário e na API.
 */
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

/** Traduz os valores do formulário para o corpo que a API espera. */
export function toTaskBody(
  values: TaskFormValues,
): CreateTaskBody & UpdateTaskBody {
  return {
    title: values.title,
    // Campo em branco significa "sem descrição", e null é como o contrato
    // expressa isso - string vazia seria persistida como conteúdo.
    description: values.description === '' ? null : values.description,
    status: values.status,
    dueDate: values.dueDate === '' ? null : parseDateInput(values.dueDate),
    teamIds: values.teamIds,
  }
}
