import type { Express } from 'express'
import pino from 'pino'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { TaskNotFoundError } from '../../../src/domain/task/errors/task-errors'
import { TeamNameAlreadyInUseError } from '../../../src/domain/team/errors/team-errors'
import type { Env } from '../../../src/infrastructure/config/env'
import type { PinoLogger } from '../../../src/infrastructure/logging/pino-logger'
import type { PrismaClient } from '../../../src/infrastructure/persistence/prisma/prisma-client'
import { createApp } from '../../../src/interfaces/http/app'
import type { TaskController } from '../../../src/interfaces/http/controllers/task.controller'
import type { TeamController } from '../../../src/interfaces/http/controllers/team.controller'
import { RecordingLogger } from '../../fakes/recording-logger'

const ENV: Env = {
  NODE_ENV: 'test',
  PORT: 3333,
  DATABASE_URL: 'postgresql://ninguem@localhost:1/vazio',
  LOG_LEVEL: 'silent',
  CORS_ORIGIN: '*',
}

let thrown: unknown = null
let logger: RecordingLogger

function buildApp(): Express {
  logger = new RecordingLogger()

  const passthrough = ((_req, res) => {
    if (thrown) throw thrown
    res.status(200).json({ data: null })
  }) as TeamController['list']

  const teamController = {
    list: passthrough,
    getById: passthrough,
    create: passthrough,
    update: passthrough,
    remove: passthrough,
  } as unknown as TeamController

  const taskController = {
    list: passthrough,
    getById: passthrough,
    create: passthrough,
    update: passthrough,
    changeStatus: passthrough,
    remove: passthrough,
  } as unknown as TaskController

  return createApp({
    env: ENV,
    logger: Object.assign(logger, {
      instance: pino({ level: 'silent' }),
    }) as unknown as PinoLogger,
    prisma: {
      $queryRaw: async () => [{ '?column?': 1 }],
    } as unknown as PrismaClient,
    teamController,
    taskController,
  })
}

describe('tratamento de erro HTTP', () => {
  let app: Express

  beforeEach(() => {
    thrown = null
    app = buildApp()
  })

  describe('erros de transporte', () => {
    it('responde 400 para JSON malformado, e nao 500', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Content-Type', 'application/json')
        .send('{"name": "Squad Alpha",}')

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('nao vaza a mensagem interna do parser no corpo malformado', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Content-Type', 'application/json')
        .send('{ nao e json }')

      expect(response.body.error.message).not.toMatch(
        /JSON\.parse|position \d+/i,
      )
    })

    it('responde 413 quando o corpo excede o limite', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ title: 'x'.repeat(2 * 1024 * 1024) }))

      expect(response.status).toBe(413)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('responde rota inexistente no mesmo envelope', async () => {
      const response = await request(app).get('/api/nao-existe')

      expect(response.status).toBe(404)
      expect(response.body.error).toMatchObject({ code: 'NOT_FOUND' })
    })

    it('trata metodo nao suportado como rota inexistente', async () => {
      const response = await request(app).patch('/api/teams')

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('erros de dominio', () => {
    it('traduz NOT_FOUND para 404', async () => {
      thrown = new TaskNotFoundError('a0000001-0000-4000-8000-000000000001')

      const response = await request(app).get('/api/tasks')

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('NOT_FOUND')
    })

    it('traduz CONFLICT para 409 preservando details', async () => {
      thrown = new TeamNameAlreadyInUseError('Squad Alpha')

      const response = await request(app).get('/api/teams')

      expect(response.status).toBe(409)
      expect(response.body.error.details).toEqual([
        { path: 'name', message: expect.stringContaining('Squad Alpha') },
      ])
    })
  })

  describe('falha inesperada', () => {
    beforeEach(() => {
      thrown = new Error('conexao recusada pelo banco em 10.0.0.7')
    })

    it('responde 500 sem vazar detalhe interno', async () => {
      const response = await request(app).get('/api/teams')

      expect(response.status).toBe(500)
      expect(response.body.error.code).toBe('INTERNAL_ERROR')
      expect(JSON.stringify(response.body)).not.toMatch(/10\.0\.0\.7/)
      expect(response.body.error.details).toBeUndefined()
    })

    it('registra a falha com stack para investigacao', async () => {
      await request(app).get('/api/teams')

      const registro = logger.entries.find((e) => e.level === 'error')

      expect(registro?.context).toMatchObject({
        method: 'GET',
        path: '/api/teams',
        error: expect.stringContaining('10.0.0.7'),
      })
      expect(registro?.context?.stack).toBeTruthy()
    })
  })

  describe('rejeicao assincrona', () => {
    it('encaminha promise rejeitada do handler ao middleware de erro', async () => {
      thrown = new TaskNotFoundError('a0000009-0000-4000-8000-000000000009')

      const response = await request(app).delete(
        '/api/tasks/a0000009-0000-4000-8000-000000000009',
      )

      expect(response.status).toBe(404)
    })
  })

  describe('health', () => {
    it('liveness responde sem consultar o banco', async () => {
      const response = await request(app).get('/health')

      expect(response.status).toBe(200)
      expect(response.body.data.status).toBe('ok')
    })
  })
})
