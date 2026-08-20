import { z } from 'zod'
import { paginationQuerySchema } from '../common/pagination'

/**
 * Cor do time em hexadecimal de 6 dígitos. Renderizada como chip na tarefa.
 *
 * As mensagens deste arquivo são exibidas ao usuário final: elas viajam no
 * `details` do envelope de erro da API e são as mesmas que o formulário do app
 * mostra sob cada campo. Por isso estão em pt-BR, acentuadas.
 */
export const colorHexSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal #RRGGBB')
  .transform((value) => value.toUpperCase())

export const teamNameSchema = z
  .string()
  .trim()
  .min(2, 'Nome do time deve ter ao menos 2 caracteres')
  .max(60, 'Nome do time deve ter no máximo 60 caracteres')

export const teamDescriptionSchema = z
  .string()
  .trim()
  .max(500, 'Descrição deve ter no máximo 500 caracteres')

// ---------- Entrada ----------

export const createTeamBodySchema = z.object({
  name: teamNameSchema,
  colorHex: colorHexSchema,
  // nullish (e não apenas optional) porque `null` é como o contrato expressa
  // "sem descrição" - o que o formulário precisa para LIMPAR o campo na edição.
  description: teamDescriptionSchema.nullish(),
})

export const updateTeamBodySchema = createTeamBodySchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  })

export const TEAM_SORT_OPTIONS = [
  'name:asc',
  'name:desc',
  'createdAt:asc',
  'createdAt:desc',
] as const

export const listTeamsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(TEAM_SORT_OPTIONS).default('name:asc'),
})

export type CreateTeamBody = z.infer<typeof createTeamBodySchema>
export type UpdateTeamBody = z.infer<typeof updateTeamBodySchema>
export type ListTeamsQuery = z.infer<typeof listTeamsQuerySchema>
export type TeamSortOption = (typeof TEAM_SORT_OPTIONS)[number]

// ---------- Saída ----------

/** Resumo embutido na tarefa: o suficiente para o chip de cor, sem round-trip extra. */
export interface TeamSummaryDTO {
  id: string
  name: string
  colorHex: string
}

export interface TeamDTO extends TeamSummaryDTO {
  description: string | null
  taskCount: number
  createdAt: string
  updatedAt: string
}
