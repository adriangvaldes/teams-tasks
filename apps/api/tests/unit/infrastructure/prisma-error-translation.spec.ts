import { Prisma } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { UniqueEntityId } from '../../../src/domain/shared/unique-entity-id'
import { TaskNotFoundError } from '../../../src/domain/task/errors/task-errors'
import { Task } from '../../../src/domain/task/task.entity'
import {
  TeamNameAlreadyInUseError,
  TeamNotFoundError,
  TeamsNotFoundError,
} from '../../../src/domain/team/errors/team-errors'
import { Team } from '../../../src/domain/team/team.entity'
import type { PrismaClient } from '../../../src/infrastructure/persistence/prisma/prisma-client'
import { PrismaTaskRepository } from '../../../src/infrastructure/persistence/prisma/prisma-task.repository'
import { PrismaTeamRepository } from '../../../src/infrastructure/persistence/prisma/prisma-team.repository'

const NOW = new Date('2026-03-10T12:00:00.000Z')
const TEAM_ID = UniqueEntityId.create('11111111-1111-4111-8111-111111111111')
const TASK_ID = UniqueEntityId.create('a0000001-0000-4000-8000-000000000001')

function prismaError(
  code: string,
  meta?: Record<string, unknown>,
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('falha simulada', {
    code,
    clientVersion: 'test',
    ...(meta ? { meta } : {}),
  })
}

function makeTeam(): Team {
  return Team.create({ name: 'Squad Alpha', colorHex: '#2563EB' }, TEAM_ID, NOW)
}

function makeTask(): Task {
  return Task.create(
    { title: 'Implementar listagem', teamIds: [TEAM_ID.value] },
    TASK_ID,
    NOW,
  )
}

/**
 * Estes casos cobrem CORRIDAS: o caso de uso ja verificou a precondicao, mas
 * outra requisicao mudou o banco entre a verificacao e a escrita. Sem traducao,
 * todos virariam 500.
 */
describe('traducao de erro do Prisma para erro de dominio', () => {
  describe('PrismaTeamRepository', () => {
    it('converte violacao de unicidade de nome em conflito', async () => {
      const prisma = {
        team: {
          create: () =>
            Promise.reject(prismaError('P2002', { target: ['name'] })),
        },
      } as unknown as PrismaClient

      await expect(
        new PrismaTeamRepository(prisma).create(makeTeam()),
      ).rejects.toBeInstanceOf(TeamNameAlreadyInUseError)
    })

    it('converte unicidade tambem no update', async () => {
      const prisma = {
        team: {
          update: () =>
            Promise.reject(prismaError('P2002', { target: ['name'] })),
        },
      } as unknown as PrismaClient

      await expect(
        new PrismaTeamRepository(prisma).update(makeTeam()),
      ).rejects.toBeInstanceOf(TeamNameAlreadyInUseError)
    })

    it('converte registro inexistente em NOT_FOUND ao apagar', async () => {
      const prisma = {
        team: { delete: () => Promise.reject(prismaError('P2025')) },
      } as unknown as PrismaClient

      await expect(
        new PrismaTeamRepository(prisma).delete(TEAM_ID),
      ).rejects.toBeInstanceOf(TeamNotFoundError)
    })

    it('nao mascara violacao de unicidade em outro campo', async () => {
      const prisma = {
        team: {
          create: () =>
            Promise.reject(prismaError('P2002', { target: ['id'] })),
        },
      } as unknown as PrismaClient

      // Um conflito de id nao e "nome ja em uso": deve subir como falha
      // inesperada, para nao mentir sobre a causa.
      await expect(
        new PrismaTeamRepository(prisma).create(makeTeam()),
      ).rejects.not.toBeInstanceOf(TeamNameAlreadyInUseError)
    })

    it('repassa erro desconhecido sem alterar', async () => {
      const boom = new Error('conexao recusada')
      const prisma = {
        team: { create: () => Promise.reject(boom) },
      } as unknown as PrismaClient

      await expect(
        new PrismaTeamRepository(prisma).create(makeTeam()),
      ).rejects.toBe(boom)
    })
  })

  describe('PrismaTaskRepository', () => {
    it('converte violacao de chave estrangeira em times nao encontrados', async () => {
      const prisma = {
        task: { create: () => Promise.reject(prismaError('P2003')) },
      } as unknown as PrismaClient

      const promise = new PrismaTaskRepository(prisma).create(makeTask())

      await expect(promise).rejects.toBeInstanceOf(TeamsNotFoundError)
      await expect(promise).rejects.toThrow(TEAM_ID.value)
    })

    it('converte registro inexistente em NOT_FOUND ao apagar', async () => {
      const prisma = {
        task: { delete: () => Promise.reject(prismaError('P2025')) },
      } as unknown as PrismaClient

      await expect(
        new PrismaTaskRepository(prisma).delete(TASK_ID),
      ).rejects.toBeInstanceOf(TaskNotFoundError)
    })

    it('converte registro inexistente em NOT_FOUND no update', async () => {
      const prisma = {
        $transaction: () => Promise.reject(prismaError('P2025')),
      } as unknown as PrismaClient

      await expect(
        new PrismaTaskRepository(prisma).update(makeTask()),
      ).rejects.toBeInstanceOf(TaskNotFoundError)
    })
  })
})
