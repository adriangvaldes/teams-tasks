import { ERROR_CODES } from '@teams-tasks/shared'
import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { type Env, parseCorsOrigin } from '../../infrastructure/config/env'
import type { PinoLogger } from '../../infrastructure/logging/pino-logger'
import type { PrismaClient } from '../../infrastructure/persistence/prisma/prisma-client'
import type { TaskController } from './controllers/task.controller'
import type { TeamController } from './controllers/team.controller'
import { createErrorHandler } from './errors/error-handler.middleware'
import { createHealthRouter } from './routes/health.routes'
import { createTaskRouter } from './routes/task.routes'
import { createTeamRouter } from './routes/team.routes'

export interface AppDependencies {
  env: Env
  logger: PinoLogger
  prisma: PrismaClient
  teamController: TeamController
  taskController: TaskController
}

/**
 * Monta a aplicacao Express a partir de dependencias JA construidas.
 *
 * Nao instancia nada por conta propria - quem faz o wiring e o composition
 * root (main.ts). Isso permite que os testes de integracao montem o mesmo app
 * apontando para outro banco, sem subir o servidor HTTP real.
 */
export function createApp({
  env,
  logger,
  prisma,
  teamController,
  taskController,
}: AppDependencies): Express {
  const app = express()

  // Confia no proxy da plataforma (Railway) para que req.ip e o protocolo
  // refletiam o cliente real, e nao o load balancer.
  app.set('trust proxy', 1)

  app.use(helmet())
  app.use(cors({ origin: parseCorsOrigin(env.CORS_ORIGIN) }))
  app.use(express.json({ limit: '1mb' }))
  app.use(
    pinoHttp({
      logger: logger.instance,
      // Health check polling da plataforma nao precisa poluir o log.
      autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
    }),
  )

  app.use('/health', createHealthRouter(prisma))
  app.use('/api/teams', createTeamRouter(teamController))
  app.use('/api/tasks', createTaskRouter(taskController))

  // Rota inexistente responde no MESMO envelope de erro das demais falhas,
  // em vez do HTML padrao do Express.
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
      },
    })
  })

  // Precisa ser o ULTIMO middleware registrado.
  app.use(createErrorHandler(logger))

  return app
}
