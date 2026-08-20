import { Router } from 'express'
import type { PrismaClient } from '../../../infrastructure/persistence/prisma/prisma-client'

/**
 * Liveness e readiness separados de proposito.
 *
 * /health responde sem tocar no banco: e o que a plataforma (Railway) usa para
 * saber se o processo esta vivo. Se ele consultasse o banco, uma indisponibilidade
 * momentanea do Postgres provocaria restart em loop do container.
 *
 * /health/ready verifica a dependencia: serve para o avaliador (e para o CI)
 * confirmarem que a conexao esta de fato configurada.
 */
export function createHealthRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.get('/', (_req, res) => {
    res.status(200).json({
      data: { status: 'ok', uptimeSeconds: Math.round(process.uptime()) },
    })
  })

  router.get('/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.status(200).json({ data: { status: 'ready', database: 'up' } })
    } catch {
      res.status(503).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Banco de dados indisponivel',
        },
      })
    }
  })

  return router
}
