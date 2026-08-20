import 'dotenv/config'
import { UniqueEntityId } from '../src/domain/shared/unique-entity-id'
import { Task } from '../src/domain/task/task.entity'
import { Team } from '../src/domain/team/team.entity'
import { loadEnv } from '../src/infrastructure/config/env'
import { createPrismaClient } from '../src/infrastructure/persistence/prisma/prisma-client'
import { PrismaTaskRepository } from '../src/infrastructure/persistence/prisma/prisma-task.repository'
import { PrismaTeamRepository } from '../src/infrastructure/persistence/prisma/prisma-team.repository'

/**
 * Seed do enunciado: 3 times e 10 tarefas.
 *
 * Duas decisoes que valem explicacao:
 *
 * 1. Passa pelas ENTIDADES DE DOMINIO e pelos repositorios, nao por inserts
 *    crus. Se uma regra de negocio mudar (ex.: titulo minimo), o seed quebra
 *    junto - ele nunca produz dado que a aplicacao consideraria invalido.
 *
 * 2. IDs FIXOS. Isso torna o seed idempotente e, principalmente, faz os
 *    exemplos de cURL do README funcionarem copiando e colando.
 */

const TEAM_IDS = {
  alpha: '11111111-1111-4111-8111-111111111111',
  design: '22222222-2222-4222-8222-222222222222',
  infra: '33333333-3333-4333-8333-333333333333',
} as const

const TEAMS = [
  {
    id: TEAM_IDS.alpha,
    name: 'Squad Alpha',
    colorHex: '#2563EB',
    description: 'Time de produto responsavel pelo app do cliente',
  },
  {
    id: TEAM_IDS.design,
    name: 'Design System',
    colorHex: '#DB2777',
    description: 'Componentes, tokens e acessibilidade',
  },
  {
    id: TEAM_IDS.infra,
    name: 'Plataforma',
    colorHex: '#059669',
    description: 'Infraestrutura, CI/CD e observabilidade',
  },
]

/** Deslocamento em dias a partir de hoje. Negativo = tarefa atrasada. */
function daysFromNow(days: number, base: Date): string {
  const date = new Date(base)
  date.setUTCDate(date.getUTCDate() + days)
  date.setUTCHours(18, 0, 0, 0)
  return date.toISOString()
}

/**
 * Cobertura pensada para exercitar a avaliacao: os tres status, tarefas com
 * zero, um e dois times, prazos vencidos, futuros e ausentes.
 */
function buildTasks(now: Date) {
  return [
    {
      id: 'a0000001-0000-4000-8000-000000000001',
      title: 'Implementar tela de listagem de tarefas',
      description: 'Lista global com filtros por time e status.',
      status: 'IN_PROGRESS',
      dueDate: daysFromNow(3, now),
      teamIds: [TEAM_IDS.alpha],
    },
    {
      id: 'a0000002-0000-4000-8000-000000000002',
      title: 'Definir tokens de cor do tema escuro',
      description: 'Paleta acessivel com contraste minimo AA.',
      status: 'PENDING',
      dueDate: daysFromNow(7, now),
      teamIds: [TEAM_IDS.design],
    },
    {
      id: 'a0000003-0000-4000-8000-000000000003',
      title: 'Configurar pipeline de deploy da API',
      description: 'Build do Docker e deploy automatico na branch main.',
      status: 'DONE',
      dueDate: daysFromNow(-5, now),
      teamIds: [TEAM_IDS.infra],
    },
    {
      id: 'a0000004-0000-4000-8000-000000000004',
      title: 'Criar componente de chip de time',
      description: 'Usado na lista e no detalhe da tarefa.',
      status: 'DONE',
      dueDate: daysFromNow(-2, now),
      // Duas equipes: exercita o relacionamento M:N.
      teamIds: [TEAM_IDS.alpha, TEAM_IDS.design],
    },
    {
      id: 'a0000005-0000-4000-8000-000000000005',
      title: 'Revisar indices de busca de tarefas',
      description: 'Avaliar pg_trgm para o filtro de busca textual.',
      status: 'PENDING',
      // Atrasada de proposito: valida o destaque de isOverdue na UI.
      dueDate: daysFromNow(-1, now),
      teamIds: [TEAM_IDS.infra],
    },
    {
      id: 'a0000006-0000-4000-8000-000000000006',
      title: 'Escrever testes de integracao dos endpoints',
      description: null,
      status: 'IN_PROGRESS',
      dueDate: daysFromNow(2, now),
      teamIds: [TEAM_IDS.alpha, TEAM_IDS.infra],
    },
    {
      id: 'a0000007-0000-4000-8000-000000000007',
      title: 'Documentar decisoes arquiteturais no README',
      description: 'Banco escolhido, camadas e patterns.',
      status: 'IN_PROGRESS',
      dueDate: null,
      teamIds: [TEAM_IDS.alpha],
    },
    {
      id: 'a0000008-0000-4000-8000-000000000008',
      title: 'Auditar acessibilidade dos formularios',
      description: 'Labels, foco e leitores de tela.',
      status: 'PENDING',
      dueDate: daysFromNow(14, now),
      teamIds: [TEAM_IDS.design],
    },
    {
      id: 'a0000009-0000-4000-8000-000000000009',
      title: 'Preparar backlog do proximo ciclo',
      description: 'Tarefa ainda sem responsavel definido.',
      status: 'PENDING',
      dueDate: null,
      // Sem time: valida "uma tarefa pode pertencer a ZERO ou mais times".
      teamIds: [],
    },
    {
      id: 'a0000010-0000-4000-8000-000000000010',
      title: 'Migrar logs para formato estruturado',
      description: 'JSON com request id correlacionado.',
      status: 'DONE',
      dueDate: daysFromNow(-10, now),
      teamIds: [TEAM_IDS.infra],
    },
  ]
}

async function seed(): Promise<void> {
  const env = loadEnv()
  const prisma = createPrismaClient(env)

  const teamRepository = new PrismaTeamRepository(prisma)
  const taskRepository = new PrismaTaskRepository(prisma)

  try {
    // Limpa antes de inserir para que rodar `pnpm seed` duas vezes resulte
    // sempre em exatamente 3 times e 10 tarefas.
    await prisma.taskTeam.deleteMany()
    await prisma.task.deleteMany()
    await prisma.team.deleteMany()

    const now = new Date()

    for (const team of TEAMS) {
      await teamRepository.create(
        Team.create(team, UniqueEntityId.create(team.id), now),
      )
    }

    for (const task of buildTasks(now)) {
      await taskRepository.create(
        Task.create(task, UniqueEntityId.create(task.id), now),
      )
    }

    console.log(
      `Seed concluido: ${TEAMS.length} times e ${buildTasks(now).length} tarefas.`,
    )
  } finally {
    await prisma.$disconnect()
  }
}

seed().catch((error: unknown) => {
  console.error('Falha ao executar o seed:', error)
  process.exit(1)
})
