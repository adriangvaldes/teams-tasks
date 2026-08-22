import { ApiError } from '@/api/api-error'

describe('ApiError', () => {
  it('expoe a categoria do erro por bandeira, sem comparar strings na tela', () => {
    expect(new ApiError(400, 'VALIDATION_ERROR', 'x').isValidation).toBe(true)
    expect(new ApiError(404, 'NOT_FOUND', 'x').isNotFound).toBe(true)
    expect(new ApiError(409, 'CONFLICT', 'x').isConflict).toBe(true)
    expect(ApiError.network('caiu').isNetwork).toBe(true)
  })

  describe('fieldErrors', () => {
    it('converte details no formato que o react-hook-form espera', () => {
      const error = new ApiError(
        400,
        'VALIDATION_ERROR',
        'Requisicao invalida',
        [
          { path: 'title', message: 'Titulo curto demais' },
          { path: 'dueDate', message: 'Data invalida' },
        ],
      )

      expect(error.fieldErrors).toEqual({
        title: 'Titulo curto demais',
        dueDate: 'Data invalida',
      })
    })

    it('mantem a primeira mensagem quando o mesmo campo repete', () => {
      const error = new ApiError(400, 'VALIDATION_ERROR', 'x', [
        { path: 'title', message: 'primeira' },
        { path: 'title', message: 'segunda' },
      ])

      expect(error.fieldErrors.title).toBe('primeira')
    })

    it('devolve objeto vazio quando nao ha details', () => {
      expect(new ApiError(500, 'INTERNAL_ERROR', 'x').fieldErrors).toEqual({})
    })
  })

  describe('userMessage', () => {
    it('troca a mensagem tecnica de rede por orientacao acionavel', () => {
      const error = ApiError.network('Network request failed')

      expect(error.userMessage).not.toBe('Network request failed')
      expect(error.userMessage).toMatch(/API esta rodando/i)
    })

    it('preserva a mensagem da API nos demais casos', () => {
      const error = new ApiError(
        409,
        'CONFLICT',
        'Ja existe um time com esse nome',
      )

      expect(error.userMessage).toBe('Ja existe um time com esse nome')
    })
  })

  it('e um Error de verdade, capturavel por instanceof', () => {
    const error = new ApiError(404, 'NOT_FOUND', 'sumiu')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ApiError')
    expect(error.message).toBe('sumiu')
  })
})
