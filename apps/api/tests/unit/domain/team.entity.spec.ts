import { describe, expect, it } from 'vitest'
import { UniqueEntityId } from '../../../src/domain/shared/unique-entity-id'
import {
  InvalidColorHexError,
  InvalidTeamDescriptionError,
  InvalidTeamNameError,
} from '../../../src/domain/team/errors/team-errors'
import { Team } from '../../../src/domain/team/team.entity'

const ID = UniqueEntityId.create('11111111-1111-4111-8111-111111111111')
const NOW = new Date('2026-03-10T12:00:00.000Z')

function makeTeam(overrides: Partial<Parameters<typeof Team.create>[0]> = {}) {
  return Team.create(
    { name: 'Squad Alpha', colorHex: '#2563eb', ...overrides },
    ID,
    NOW,
  )
}

describe('Team', () => {
  it('normaliza o nome colapsando espacos repetidos', () => {
    const team = makeTeam({ name: '  Squad    Alpha  ' })

    expect(team.name.value).toBe('Squad Alpha')
  })

  it('normaliza a cor para maiuscula', () => {
    expect(makeTeam({ colorHex: '#2563eb' }).colorHex.value).toBe('#2563EB')
  })

  it('trata descricao vazia como ausente', () => {
    expect(makeTeam({ description: '   ' }).description).toBeNull()
  })

  it('usa o tempo injetado nos timestamps, sem consultar o relogio do sistema', () => {
    const team = makeTeam()

    expect(team.createdAt).toEqual(NOW)
    expect(team.updatedAt).toEqual(NOW)
  })

  describe('invariantes', () => {
    it('rejeita nome com menos de 2 caracteres', () => {
      expect(() => makeTeam({ name: 'A' })).toThrow(InvalidTeamNameError)
    })

    it('rejeita nome acima de 60 caracteres', () => {
      expect(() => makeTeam({ name: 'a'.repeat(61) })).toThrow(
        InvalidTeamNameError,
      )
    })

    it.each(['2563EB', '#25', '#GGGGGG', '#2563EBB'])(
      'rejeita a cor invalida %s',
      (colorHex) => {
        expect(() => makeTeam({ colorHex })).toThrow(InvalidColorHexError)
      },
    )

    it('rejeita descricao acima de 500 caracteres', () => {
      expect(() => makeTeam({ description: 'a'.repeat(501) })).toThrow(
        InvalidTeamDescriptionError,
      )
    })

    it('classifica erro de invariante como VALIDATION, sem conhecer status HTTP', () => {
      try {
        makeTeam({ colorHex: 'vermelho' })
        expect.unreachable('deveria ter lancado')
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidColorHexError)
        expect((error as InvalidColorHexError).kind).toBe('VALIDATION')
        expect((error as InvalidColorHexError).details).toEqual([
          { path: 'colorHex', message: expect.any(String) },
        ])
      }
    })
  })

  describe('mudancas de estado', () => {
    it('atualiza updatedAt ao renomear, preservando createdAt', () => {
      const team = makeTeam()
      const later = new Date('2026-03-11T08:00:00.000Z')

      team.rename('Squad Beta', later)

      expect(team.name.value).toBe('Squad Beta')
      expect(team.createdAt).toEqual(NOW)
      expect(team.updatedAt).toEqual(later)
    })

    it('permite limpar a descricao passando null', () => {
      const team = makeTeam({ description: 'Time de produto' })

      team.changeDescription(null, NOW)

      expect(team.description).toBeNull()
    })
  })

  describe('identidade', () => {
    it('compara por id, nao por valor dos atributos', () => {
      const otherId = UniqueEntityId.create(
        '22222222-2222-4222-8222-222222222222',
      )

      const sameData = Team.create(
        { name: 'Squad Alpha', colorHex: '#2563EB' },
        otherId,
        NOW,
      )

      expect(makeTeam().equals(sameData)).toBe(false)
      expect(makeTeam().equals(makeTeam())).toBe(true)
    })
  })
})
