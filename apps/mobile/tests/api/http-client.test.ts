import { ApiError } from '@/api/api-error'
import { buildQueryString, httpClient } from '@/api/http-client'

function respondWith(body: unknown, status = 200): jest.Mock {
  const mock = jest.fn(async () => ({
    ok: status < 400,
    status,
    json: async () => body,
  }))
  globalThis.fetch = mock as unknown as typeof fetch
  return mock
}

function initOf(mock: jest.Mock, callIndex: number): RequestInit {
  const call = mock.mock.calls[callIndex]
  if (!call) throw new Error(`fetch nao foi chamado ${callIndex + 1} vez(es)`)
  return call[1] as RequestInit
}

describe('buildQueryString', () => {
  it('omite filtros nao preenchidos', () => {
    expect(
      buildQueryString({
        status: 'PENDING',
        search: undefined,
        teamId: null,
        limit: '',
      }),
    ).toBe('?status=PENDING')
  })

  it('devolve string vazia quando nada foi informado', () => {
    expect(buildQueryString({ search: undefined })).toBe('')
  })

  it('preserva zero, que e valor legitimo de offset', () => {
    expect(buildQueryString({ offset: 0 })).toBe('?offset=0')
  })

  it('escapa caracteres especiais da busca', () => {
    expect(buildQueryString({ search: 'a & b' })).toContain('a+%26+b')
  })
})

describe('httpClient', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('devolve o corpo desserializado no sucesso', async () => {
    respondWith({ data: { id: '1' } })

    await expect(httpClient.get('/api/teams')).resolves.toEqual({
      data: { id: '1' },
    })
  })

  it('trata 204 sem tentar ler corpo', async () => {
    const mock = jest.fn(async () => ({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('nao deveria ser chamado')
      },
    }))
    globalThis.fetch = mock as unknown as typeof fetch

    await expect(httpClient.delete('/api/tasks/1')).resolves.toBeUndefined()
  })

  it('converte o envelope de erro da API em ApiError tipado', async () => {
    respondWith(
      {
        error: {
          code: 'CONFLICT',
          message: 'Ja existe um time chamado "Squad Alpha"',
          details: [{ path: 'name', message: 'Nome em uso' }],
        },
      },
      409,
    )

    const promise = httpClient.post('/api/teams', { name: 'Squad Alpha' })

    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await promise.catch((error: ApiError) => {
      expect(error.isConflict).toBe(true)
      expect(error.status).toBe(409)
      expect(error.fieldErrors).toEqual({ name: 'Nome em uso' })
    })
  })

  it('nao explode quando o erro vem fora do envelope esperado', async () => {
    respondWith('<html>502 Bad Gateway</html>', 502)

    await expect(httpClient.get('/api/teams')).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      status: 502,
    })
  })

  it('classifica falha de rede como NETWORK_ERROR', async () => {
    globalThis.fetch = (() =>
      Promise.reject(
        new TypeError('Network request failed'),
      )) as unknown as typeof fetch

    const promise = httpClient.get('/api/teams')

    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await promise.catch((error: ApiError) => {
      expect(error.isNetwork).toBe(true)
      expect(error.userMessage).toMatch(/servidor/i)
    })
  })

  it('envia Content-Type apenas quando ha corpo', async () => {
    const mock = respondWith({ data: null })

    await httpClient.get('/api/teams')
    const headersSemCorpo = initOf(mock, 0).headers

    await httpClient.post('/api/teams', { name: 'x' })
    const headersComCorpo = initOf(mock, 1).headers

    expect(headersSemCorpo).not.toHaveProperty('Content-Type')
    expect(headersComCorpo).toHaveProperty('Content-Type', 'application/json')
  })

  it('serializa o corpo em JSON', async () => {
    const mock = respondWith({ data: null })

    await httpClient.patch('/api/tasks/1/status', { status: 'DONE' })

    expect(initOf(mock, 0).body).toBe('{"status":"DONE"}')
  })
})
