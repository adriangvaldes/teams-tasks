import 'dotenv/config'
import { createContainer } from './container'
import { loadEnv } from './infrastructure/config/env'
import { createApp } from './interfaces/http/app'

async function bootstrap(): Promise<void> {
  const env = loadEnv()
  const container = createContainer(env)
  const { logger } = container

  const app = createApp({
    env,
    logger,
    prisma: container.prisma,
    teamController: container.teamController,
    taskController: container.taskController,
  })

  const server = app.listen(env.PORT, () => {
    logger.info('API disponivel', {
      port: env.PORT,
      env: env.NODE_ENV,
      url: `http://localhost:${env.PORT}/api`,
    })
  })

  const shutdown = (signal: string) => {
    logger.info('Encerrando servidor', { signal })

    server.close(async () => {
      await container.shutdown()
      process.exit(0)
    })

    setTimeout(() => {
      logger.warn('Shutdown forcado apos timeout')
      process.exit(1)
    }, 10_000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

bootstrap().catch((error: unknown) => {
  console.error('Falha ao iniciar a API:', error)
  process.exit(1)
})
