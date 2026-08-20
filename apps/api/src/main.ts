import 'dotenv/config'
import { createContainer } from './container'
import { loadEnv } from './infrastructure/config/env'
import { createApp } from './interfaces/http/app'

/**
 * Bootstrap do processo. Responsabilidades: carregar e validar o ambiente,
 * montar o composition root, subir o HTTP e desligar com elegancia.
 */
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

  // Graceful shutdown: o Railway envia SIGTERM no deploy. Sem isso, requests
  // em andamento sao cortados no meio e conexoes do Postgres ficam presas.
  const shutdown = (signal: string) => {
    logger.info('Encerrando servidor', { signal })

    server.close(async () => {
      await container.shutdown()
      process.exit(0)
    })

    // Rede de seguranca: se algo travar o close, nao ficamos pendurados.
    setTimeout(() => {
      logger.warn('Shutdown forcado apos timeout')
      process.exit(1)
    }, 10_000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

bootstrap().catch((error: unknown) => {
  // O logger pode nem ter sido construido (ex.: env invalido), entao o
  // fallback aqui e o console mesmo.
  console.error('Falha ao iniciar a API:', error)
  process.exit(1)
})
