import { z } from 'zod'

/**
 * Path param `:id`. Vive na camada de interface (e nao no pacote shared)
 * porque "id na URL" e um detalhe de roteamento HTTP, nao parte do contrato
 * de dados que o mobile reusa nos formularios.
 */
export const idParamsSchema = z.object({
  id: z.uuid('id deve ser um UUID válido'),
})
