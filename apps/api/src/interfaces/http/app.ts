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

export function createApp({
  env,
  logger,
  prisma,
  teamController,
  taskController,
}: AppDependencies): Express {
  const app = express()

  app.set('trust proxy', 1)

  app.use(helmet())
  app.use(cors({ origin: parseCorsOrigin(env.CORS_ORIGIN) }))
  app.use(express.json({ limit: '1mb' }))
  app.use(
    pinoHttp({
      logger: logger.instance,

      autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
    }),
  )

  app.use('/health', createHealthRouter(prisma))
  app.use('/api/teams', createTeamRouter(teamController))
  app.use('/api/tasks', createTaskRouter(taskController))

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
      },
    })
  })

  app.use(createErrorHandler(logger))

  return app
}
