import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  createTestContext,
  resetDatabase,
  type TestContext,
} from './helpers/test-app'

const context: TestContext = createTestContext()
const api = () => request(context.app)

const VALID_TEAM = {
  name: 'Squad Alpha',
  colorHex: '#2563EB',
  description: 'Time de produto',
}

beforeEach(async () => {
  await resetDatabase(context.prisma)
})

afterAll(async () => {
  await context.shutdown()
})

describe('POST /api/teams', () => {
  it('cria o time e devolve 201 com envelope { data }', async () => {
    const response = await api().post('/api/teams').send(VALID_TEAM)

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      name: 'Squad Alpha',
      colorHex: '#2563EB',
      description: 'Time de produto',
      taskCount: 0,
    })
    expect(response.body.data.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(response.body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('normaliza a cor para maiuscula ao persistir', async () => {
    const response = await api()
      .post('/api/teams')
      .send({ ...VALID_TEAM, colorHex: '#2563eb' })

    expect(response.body.data.colorHex).toBe('#2563EB')
  })

  it('devolve 409 CONFLICT para nome duplicado', async () => {
    await api().post('/api/teams').send(VALID_TEAM)

    const response = await api()
      .post('/api/teams')
      .send({ ...VALID_TEAM, name: 'squad alpha' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('CONFLICT')
  })

  it('devolve 400 com details apontando o campo invalido', async () => {
    const response = await api()
      .post('/api/teams')
      .send({ name: 'A', colorHex: 'azul' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(response.body.error.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(['name', 'colorHex']),
    )
  })
})

describe('GET /api/teams', () => {
  beforeEach(async () => {
    for (const team of [
      { name: 'Squad Alpha', colorHex: '#2563EB' },
      { name: 'Design System', colorHex: '#DB2777' },
      { name: 'Plataforma', colorHex: '#059669' },
    ]) {
      await api().post('/api/teams').send(team)
    }
  })

  it('devolve a lista com metadata de paginacao', async () => {
    const response = await api().get('/api/teams')

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(3)
    expect(response.body.meta).toEqual({
      total: 3,
      limit: 20,
      offset: 0,
      hasMore: false,
    })
  })

  it('indica hasMore quando ha mais paginas', async () => {
    const response = await api().get('/api/teams?limit=2&offset=0')

    expect(response.body.data).toHaveLength(2)
    expect(response.body.meta).toMatchObject({ total: 3, hasMore: true })
  })

  it('ordena por nome ascendente por padrao', async () => {
    const response = await api().get('/api/teams')

    expect(
      response.body.data.map((team: { name: string }) => team.name),
    ).toEqual(['Design System', 'Plataforma', 'Squad Alpha'])
  })

  it('filtra pela busca textual ignorando a caixa', async () => {
    const response = await api().get('/api/teams?search=SQUAD')

    expect(response.body.data).toHaveLength(1)
    expect(response.body.meta.total).toBe(1)
  })

  it('rejeita limit acima do maximo permitido', async () => {
    const response = await api().get('/api/teams?limit=500')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /api/teams/:id', () => {
  it('devolve o time com a contagem de tarefas', async () => {
    const { body } = await api().post('/api/teams').send(VALID_TEAM)

    await api()
      .post('/api/tasks')
      .send({ title: 'Primeira tarefa', teamIds: [body.data.id] })

    const response = await api().get(`/api/teams/${body.data.id}`)

    expect(response.status).toBe(200)
    expect(response.body.data.taskCount).toBe(1)
  })

  it('devolve 404 para id inexistente', async () => {
    const response = await api().get(
      '/api/teams/99999999-9999-4999-8999-999999999999',
    )

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  it('devolve 400 para id que nao e uuid', async () => {
    const response = await api().get('/api/teams/nao-e-uuid')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('PUT /api/teams/:id', () => {
  it('atualiza apenas os campos enviados', async () => {
    const { body } = await api().post('/api/teams').send(VALID_TEAM)

    const response = await api()
      .put(`/api/teams/${body.data.id}`)
      .send({ colorHex: '#111111' })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      name: 'Squad Alpha',
      colorHex: '#111111',
      description: 'Time de produto',
    })
  })

  it('rejeita corpo vazio', async () => {
    const { body } = await api().post('/api/teams').send(VALID_TEAM)

    const response = await api().put(`/api/teams/${body.data.id}`).send({})

    expect(response.status).toBe(400)
  })
})

describe('DELETE /api/teams/:id', () => {
  it('remove o time e devolve 204 sem corpo', async () => {
    const { body } = await api().post('/api/teams').send(VALID_TEAM)

    const response = await api().delete(`/api/teams/${body.data.id}`)

    expect(response.status).toBe(204)
    expect(response.body).toEqual({})

    const after = await api().get(`/api/teams/${body.data.id}`)
    expect(after.status).toBe(404)
  })

  it('preserva as tarefas do time, apenas desvinculando', async () => {
    const { body: team } = await api().post('/api/teams').send(VALID_TEAM)
    const { body: task } = await api()
      .post('/api/tasks')
      .send({ title: 'Tarefa vinculada', teamIds: [team.data.id] })

    await api().delete(`/api/teams/${team.data.id}`)

    const response = await api().get(`/api/tasks/${task.data.id}`)

    expect(response.status).toBe(200)
    expect(response.body.data.teams).toEqual([])
  })

  it('devolve 404 ao remover time inexistente', async () => {
    const response = await api().delete(
      '/api/teams/99999999-9999-4999-8999-999999999999',
    )

    expect(response.status).toBe(404)
  })
})
