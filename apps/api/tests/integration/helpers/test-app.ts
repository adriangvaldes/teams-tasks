import type { Express } from 'express'
import { inject } from 'vitest'
import { createContainer } from '../../../src/container'
import { loadEnv } from '../../../src/infrastructure/config/env'
import type { PrismaClient } from '../../../src/infrastructure/persistence/prisma/prisma-client'
import { createApp } from '../../../src/interfaces/http/app'

export interface TestContext {
  app: Express
  prisma: PrismaClient
  shutdown: () => Promise<void>
}

export function createTestContext(): TestContext {
  const env = loadEnv({
    ...process.env,
    DATABASE_URL: inject('databaseUrl'),
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  })

  const container = createContainer(env)

  const app = createApp({
    env,
    logger: container.logger,
    prisma: container.prisma,
    teamController: container.teamController,
    taskController: container.taskController,
  })

  return { app, prisma: container.prisma, shutdown: container.shutdown }
}

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "task_teams", "tasks", "teams" CASCADE',
  )
}
