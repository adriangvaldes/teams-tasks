import {
  type CreateTeamBody,
  colorHexSchema,
  teamNameSchema,
} from '@teams-tasks/shared'
import { z } from 'zod'

export const teamFormSchema = z.object({
  name: teamNameSchema,
  colorHex: colorHexSchema,
  description: z
    .string()
    .trim()
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
})

export type TeamFormValues = z.infer<typeof teamFormSchema>

export const TEAM_COLOR_PRESETS = [
  '#2563EB',
  '#DB2777',
  '#059669',
  '#D97706',
  '#7C3AED',
  '#0891B2',
  '#DC2626',
  '#475569',
] as const

export const EMPTY_TEAM_FORM: TeamFormValues = {
  name: '',
  colorHex: TEAM_COLOR_PRESETS[0],
  description: '',
}

export function toTeamBody(values: TeamFormValues): CreateTeamBody {
  return {
    name: values.name,
    colorHex: values.colorHex,
    description: values.description === '' ? null : values.description,
  }
}
