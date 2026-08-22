import { Router } from 'express'
import type { PrismaClient } from '../../../infrastructure/persistence/prisma/prisma-client'

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
          message: 'Banco de dados indisponível',
        },
      })
    }
  })

  return router
}
