import type { TeamDTO, TeamSummaryDTO } from '@teams-tasks/shared'
import type {
  TeamOutput,
  TeamSummaryOutput,
} from '../../../application/dtos/team.dto'

/**
 * Travessia aplicacao -> HTTP. Responsabilidade unica: serializar.
 *
 * E aqui que `Date` se torna string ISO 8601. A camada de aplicacao trabalha
 * com Date porque isso e o correto para regra de negocio; JSON nao tem tipo
 * data, e essa conversao e um detalhe do transporte.
 *
 * O tipo de retorno e o TeamDTO do pacote shared, o mesmo que o app mobile
 * consome: se o contrato mudar de um lado, o TypeScript quebra no outro.
 */
export const TeamPresenter = {
  toDTO(output: TeamOutput): TeamDTO {
    return {
      id: output.id,
      name: output.name,
      colorHex: output.colorHex,
      description: output.description,
      taskCount: output.taskCount,
      createdAt: output.createdAt.toISOString(),
      updatedAt: output.updatedAt.toISOString(),
    }
  },

  toSummaryDTO(output: TeamSummaryOutput): TeamSummaryDTO {
    return {
      id: output.id,
      name: output.name,
      colorHex: output.colorHex,
    }
  },
} as const
