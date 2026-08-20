import { PrismaClient } from '@prisma/client'
import type { Env } from '../../config/env'

/**
 * Fabrica do PrismaClient. Recebe o Env validado em vez de ler process.env,
 * para que testes de integracao possam apontar para outro banco.
 */
export function createPrismaClient(env: Env): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
    log:
      env.NODE_ENV === 'development'
        ? [{ emit: 'stdout', level: 'warn' }, { emit: 'stdout', level: 'error' }]
        : [{ emit: 'stdout', level: 'error' }],
  })
}

export type { PrismaClient }
