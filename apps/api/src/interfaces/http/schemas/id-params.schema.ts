import { z } from 'zod'

export const idParamsSchema = z.object({
  id: z.uuid('id deve ser um UUID válido'),
})
