import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  createTestContext,
  resetDatabase,
  type TestContext,
} from './helpers/test-app'

const context: TestContext = createTestContext()
const api = () => request(context.app)

let alphaId: string
let designId: string

beforeEach(async () => {
  await resetDatabase(context.prisma)

  const alpha = await api()
    .post('/api/teams')
    .send({ name: 'Squad Alpha', colorHex: '#2563EB' })
  const design = await api()
    .post('/api/teams')
    .send({ name: 'Design System', colorHex: '#DB2777' })

  alphaId = alpha.body.data.id
  designId = design.body.data.id
})

afterAll(async () => {
  await context.shutdown()
})

describe('POST /api/tasks', () => {
  it('cria a tarefa com status PENDING por padrao', async () => {
    const response = await api()
      .post('/api/tasks')
      .send({ title: 'Implementar listagem' })

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      title: 'Implementar listagem',
      status: 'PENDING',
      description: null,
      dueDate: null,
      teams: [],
      isOverdue: false,
    })
  })

  it('embute os times na resposta, para o chip de cor da lista', async () => {
    const response = await api()
      .post('/api/tasks')
      .send({ title: 'Criar componente de chip', teamIds: [alphaId, designId] })

    expect(response.body.data.teams).toEqual(
      expect.arrayContaining([
        { id: alphaId, name: 'Squad Alpha', colorHex: '#2563EB' },
        { id: designId, name: 'Design System', colorHex: '#DB2777' },
      ]),
    )
  })

  it('devolve 400 quando o titulo tem menos de 3 caracteres', async () => {
    const response = await api().post('/api/tasks').send({ title: 'ab' })

    expect(response.status).toBe(400)
    expect(response.body.error.details).toEqual([
      { path: 'title', message: expect.stringContaining('3 caracteres') },
    ])
  })

  it('devolve 404 quando algum time informado nao existe', async () => {
    const response = await api()
      .post('/api/tasks')
      .send({
        title: 'Tarefa orfa',
        teamIds: ['99999999-9999-4999-8999-999999999999'],
      })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  it('marca isOverdue quando o prazo enviado ja passou', async () => {
    const response = await api()
      .post('/api/tasks')
      .send({ title: 'Tarefa atrasada', dueDate: '2020-01-01T00:00:00.000Z' })

    expect(response.body.data.isOverdue).toBe(true)
  })
})

describe('GET /api/tasks', () => {
  beforeEach(async () => {
    const fixtures = [
      {
        title: 'Implementar listagem',
        status: 'IN_PROGRESS',
        teamIds: [alphaId],
      },
      { title: 'Configurar pipeline', status: 'DONE', teamIds: [designId] },
      {
        title: 'Revisar indices de busca',
        status: 'PENDING',
        teamIds: [designId],
      },
      { title: 'Preparar backlog', status: 'PENDING', teamIds: [] },
    ]

    for (const task of fixtures) {
      await api().post('/api/tasks').send(task)
    }
  })

  it('lista todas as tarefas com metadata', async () => {
    const response = await api().get('/api/tasks')

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(4)
    expect(response.body.meta).toMatchObject({ total: 4, hasMore: false })
  })

  it('filtra por teamId', async () => {
    const response = await api().get(`/api/tasks?teamId=${designId}`)

    expect(response.body.meta.total).toBe(2)
  })

  it('filtra por status', async () => {
    const response = await api().get('/api/tasks?status=PENDING')

    expect(response.body.meta.total).toBe(2)
  })

  it('aceita varios status separados por virgula', async () => {
    const response = await api().get('/api/tasks?status=PENDING,DONE')

    const statuses = response.body.data.map(
      (task: { status: string }) => task.status,
    )

    expect(response.status).toBe(200)
    expect(statuses).not.toContain('IN_PROGRESS')
    expect(response.body.meta.total).toBeGreaterThan(1)
  })

  it('aceita varios times separados por virgula', async () => {
    const somenteAlpha = await api().get(`/api/tasks?teamId=${alphaId}`)
    const ambos = await api().get(`/api/tasks?teamId=${alphaId},${designId}`)

    expect(ambos.body.meta.total).toBeGreaterThan(somenteAlpha.body.meta.total)
  })

  it('ignora valores repetidos na lista', async () => {
    const uma = await api().get('/api/tasks?status=PENDING')
    const repetida = await api().get('/api/tasks?status=PENDING,PENDING')

    expect(repetida.body.meta.total).toBe(uma.body.meta.total)
  })

  it('rejeita a lista inteira quando um valor e invalido', async () => {
    const response = await api().get('/api/tasks?status=PENDING,NAO_EXISTE')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('trata lista vazia como ausencia de filtro', async () => {
    const semFiltro = await api().get('/api/tasks')
    const vazia = await api().get('/api/tasks?status=')

    expect(vazia.body.meta.total).toBe(semFiltro.body.meta.total)
  })

  it('combina teamId e status', async () => {
    const response = await api().get(
      `/api/tasks?teamId=${designId}&status=PENDING`,
    )

    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].title).toBe('Revisar indices de busca')
  })

  it('busca por texto ignorando a caixa', async () => {
    const response = await api().get('/api/tasks?search=INDICES')

    expect(response.body.meta.total).toBe(1)
  })

  it('trata curingas de LIKE como texto literal na busca', async () => {
    const todas = await api().get('/api/tasks')

    const porcento = await api().get('/api/tasks?search=%25')
    const sublinhado = await api().get('/api/tasks?search=_')

    expect(todas.body.meta.total).toBeGreaterThan(0)
    expect(porcento.body.meta.total).toBe(0)
    expect(sublinhado.body.meta.total).toBe(0)
  })

  it('encontra a tarefa que contem o curinga no titulo', async () => {
    await api().post('/api/tasks').send({ title: 'Cobertura em 50% do app' })

    const response = await api().get('/api/tasks?search=50%25')

    expect(response.body.meta.total).toBe(1)
    expect(response.body.data[0].title).toBe('Cobertura em 50% do app')
  })

  it('pagina mantendo o total do conjunto filtrado', async () => {
    const response = await api().get('/api/tasks?status=PENDING&limit=1')

    expect(response.body.data).toHaveLength(1)
    expect(response.body.meta).toMatchObject({ total: 2, hasMore: true })
  })

  it('ordena por titulo ascendente quando solicitado', async () => {
    const response = await api().get('/api/tasks?sort=title:asc')

    expect(response.body.data[0].title).toBe('Configurar pipeline')
  })

  it('rejeita valor de sort fora da lista permitida', async () => {
    const response = await api().get('/api/tasks?sort=titulo:acima')

    expect(response.status).toBe(400)
  })

  it('rejeita status desconhecido', async () => {
    const response = await api().get('/api/tasks?status=ARQUIVADA')

    expect(response.status).toBe(400)
  })
})

describe('PATCH /api/tasks/:id/status', () => {
  it('altera o status e devolve a tarefa atualizada', async () => {
    const { body } = await api()
      .post('/api/tasks')
      .send({ title: 'Implementar listagem', teamIds: [alphaId] })

    const response = await api()
      .patch(`/api/tasks/${body.data.id}/status`)
      .send({ status: 'DONE' })

    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('DONE')

    expect(response.body.data.teams).toHaveLength(1)
  })

  it('persiste a mudanca', async () => {
    const { body } = await api()
      .post('/api/tasks')
      .send({ title: 'Uma tarefa' })

    await api()
      .patch(`/api/tasks/${body.data.id}/status`)
      .send({ status: 'IN_PROGRESS' })

    const response = await api().get(`/api/tasks/${body.data.id}`)

    expect(response.body.data.status).toBe('IN_PROGRESS')
  })

  it('devolve 400 para status invalido', async () => {
    const { body } = await api()
      .post('/api/tasks')
      .send({ title: 'Uma tarefa' })

    const response = await api()
      .patch(`/api/tasks/${body.data.id}/status`)
      .send({ status: 'ARQUIVADA' })

    expect(response.status).toBe(400)
  })
})

describe('PUT /api/tasks/:id', () => {
  it('substitui o conjunto de times', async () => {
    const { body } = await api()
      .post('/api/tasks')
      .send({ title: 'Implementar listagem', teamIds: [alphaId] })

    const response = await api()
      .put(`/api/tasks/${body.data.id}`)
      .send({ teamIds: [designId] })

    expect(response.body.data.teams.map((t: { id: string }) => t.id)).toEqual([
      designId,
    ])
  })

  it('preserva campos ausentes e limpa os enviados como null', async () => {
    const { body } = await api().post('/api/tasks').send({
      title: 'Implementar listagem',
      description: 'Descricao original',
      dueDate: '2026-12-01T18:00:00.000Z',
    })

    const response = await api()
      .put(`/api/tasks/${body.data.id}`)
      .send({ description: null })

    expect(response.body.data.title).toBe('Implementar listagem')
    expect(response.body.data.description).toBeNull()
    expect(response.body.data.dueDate).toBe('2026-12-01T18:00:00.000Z')
  })
})

describe('DELETE /api/tasks/:id', () => {
  it('remove a tarefa e devolve 204', async () => {
    const { body } = await api()
      .post('/api/tasks')
      .send({ title: 'Uma tarefa' })

    expect((await api().delete(`/api/tasks/${body.data.id}`)).status).toBe(204)
    expect((await api().get(`/api/tasks/${body.data.id}`)).status).toBe(404)
  })
})

describe('contratos gerais da API', () => {
  it('responde rota inexistente no mesmo envelope de erro', async () => {
    const response = await api().get('/api/inexistente')

    expect(response.status).toBe(404)
    expect(response.body.error).toMatchObject({ code: 'NOT_FOUND' })
  })

  it('expoe liveness sem depender do banco', async () => {
    const response = await api().get('/health')

    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('ok')
  })

  it('expoe readiness confirmando a conexao com o banco', async () => {
    const response = await api().get('/health/ready')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({ status: 'ready', database: 'up' })
  })
})
