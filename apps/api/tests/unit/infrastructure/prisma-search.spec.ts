import { describe, expect, it } from 'vitest'
import { escapeLikePattern } from '../../../src/infrastructure/persistence/prisma/prisma-search'

describe('escapeLikePattern', () => {
  it('deixa termos comuns intactos', () => {
    expect(escapeLikePattern('deploy')).toBe('deploy')
    expect(escapeLikePattern('Design System')).toBe('Design System')
    expect(escapeLikePattern('acentuação e ç')).toBe('acentuação e ç')
  })

  it('escapa o curinga de multiplos caracteres', () => {
    expect(escapeLikePattern('%')).toBe('\\%')
    expect(escapeLikePattern('50% concluido')).toBe('50\\% concluido')
  })

  it('escapa o curinga de um caractere', () => {
    expect(escapeLikePattern('_')).toBe('\\_')
    expect(escapeLikePattern('snake_case')).toBe('snake\\_case')
  })

  it('escapa a propria barra invertida antes dos curingas', () => {
    expect(escapeLikePattern('\\')).toBe('\\\\')
    expect(escapeLikePattern('\\%')).toBe('\\\\\\%')
  })

  it('escapa todos os curingas de um termo misto', () => {
    expect(escapeLikePattern('a%b_c\\d')).toBe('a\\%b\\_c\\\\d')
  })
})
