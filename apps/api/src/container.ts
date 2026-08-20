import { TeamLoader } from './application/services/team-loader.service'
import { ChangeTaskStatus } from './application/use-cases/task/change-task-status.use-case'
import { CreateTask } from './application/use-cases/task/create-task.use-case'
import { DeleteTask } from './application/use-cases/task/delete-task.use-case'
import { GetTask } from './application/use-cases/task/get-task.use-case'
import { ListTasks } from './application/use-cases/task/list-tasks.use-case'
import { UpdateTask } from './application/use-cases/task/update-task.use-case'
import { CreateTeam } from './application/use-cases/team/create-team.use-case'
import { DeleteTeam } from './application/use-cases/team/delete-team.use-case'
import { GetTeam } from './application/use-cases/team/get-team.use-case'
import { ListTeams } from './application/use-cases/team/list-teams.use-case'
import { UpdateTeam } from './application/use-cases/team/update-team.use-case'
import type { Env } from './infrastructure/config/env'
import { UuidIdGenerator } from './infrastructure/id/uuid-id-generator'
import { PinoLogger } from './infrastructure/logging/pino-logger'
import {
  createPrismaClient,
  type PrismaClient,
} from './infrastructure/persistence/prisma/prisma-client'
import { PrismaTaskRepository } from './infrastructure/persistence/prisma/prisma-task.repository'
import { PrismaTeamRepository } from './infrastructure/persistence/prisma/prisma-team.repository'
import { SystemClock } from './infrastructure/time/system-clock'
import { TaskController } from './interfaces/http/controllers/task.controller'
import { TeamController } from './interfaces/http/controllers/team.controller'

export interface Container {
  env: Env
  logger: PinoLogger
  prisma: PrismaClient
  teamController: TeamController
  taskController: TaskController
  shutdown: () => Promise<void>
}

/**
 * COMPOSITION ROOT.
 *
 * E o unico ponto do backend onde classes concretas se encontram: aqui as
 * implementacoes de infraestrutura (Prisma, Pino, UUID, Date) sao injetadas
 * nas portas que os casos de uso declararam. Todo o resto do codigo conhece
 * apenas interfaces.
 *
 * Deliberadamente SEM container de DI (tsyringe, inversify): em um dominio de
 * duas entidades, um container acrescenta decorators, metadata de reflexao e
 * erros em tempo de execucao, para resolver um grafo de dependencias que cabe
 * em uma tela e que o TypeScript ja valida em tempo de compilacao.
 */
export function createContainer(env: Env): Container {
  // --- Adapters de saida ---
  const logger = PinoLogger.create(env)
  const prisma = createPrismaClient(env)
  const clock = new SystemClock()
  const idGenerator = new UuidIdGenerator()

  const teamRepository = new PrismaTeamRepository(prisma)
  const taskRepository = new PrismaTaskRepository(prisma)

  // --- Servicos de aplicacao ---
  const teamLoader = new TeamLoader(teamRepository)

  // --- Casos de uso + adapters de entrada ---
  const teamController = new TeamController(
    new CreateTeam(teamRepository, idGenerator, clock),
    new UpdateTeam(teamRepository, taskRepository, clock),
    new GetTeam(teamRepository, taskRepository),
    new DeleteTeam(teamRepository, logger),
    new ListTeams(teamRepository, taskRepository),
  )

  const taskController = new TaskController(
    new CreateTask(taskRepository, teamLoader, idGenerator, clock),
    new UpdateTask(taskRepository, teamLoader, clock),
    new ChangeTaskStatus(taskRepository, teamLoader, clock, logger),
    new GetTask(taskRepository, teamLoader, clock),
    new DeleteTask(taskRepository, logger),
    new ListTasks(taskRepository, teamLoader, clock),
  )

  return {
    env,
    logger,
    prisma,
    teamController,
    taskController,
    shutdown: async () => {
      await prisma.$disconnect()
    },
  }
}
