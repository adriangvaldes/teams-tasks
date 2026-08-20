import type { Team as PrismaTeam } from '@prisma/client'
import { UniqueEntityId } from '../../../../domain/shared/unique-entity-id'
import { Team } from '../../../../domain/team/team.entity'
import { ColorHex } from '../../../../domain/team/value-objects/color-hex.vo'
import { TeamName } from '../../../../domain/team/value-objects/team-name.vo'

/**
 * Travessia persistencia <-> dominio.
 *
 * Este e o unico arquivo do backend que conhece a forma da linha no banco E a
 * forma da entidade. Trocar Prisma por outro ORM significa reescrever este
 * mapper e o repositorio - nada acima disso.
 *
 * Ao reidratar, os value objects sao reconstruidos e portanto REVALIDADOS: se
 * uma linha corrompida entrar no banco por fora da aplicacao, o erro aparece
 * aqui, na borda, em vez de se espalhar como dado invalido.
 */
export const PrismaTeamMapper = {
  toDomain(row: PrismaTeam): Team {
    return Team.reconstitute(
      {
        name: TeamName.create(row.name),
        colorHex: ColorHex.create(row.colorHex),
        description: row.description,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      UniqueEntityId.create(row.id),
    )
  },

  toPersistence(team: Team): PrismaTeam {
    return {
      id: team.id.value,
      name: team.name.value,
      colorHex: team.colorHex.value,
      description: team.description,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    }
  },
} as const
