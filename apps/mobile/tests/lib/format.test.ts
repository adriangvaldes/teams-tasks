import { formatDueDateLabel, maskDateInput, parseDateInput } from '@/lib/format'

const NOW = new Date('2026-08-20T12:00:00.000Z')

describe('formatDueDateLabel', () => {
  it('devolve null quando não há prazo', () => {
    expect(formatDueDateLabel(null, { now: NOW })).toBeNull()
  })

  it.each([
    ['2026-08-20T18:00:00.000Z', 'Vence hoje'],
    ['2026-08-21T18:00:00.000Z', 'Vence amanhã'],
    ['2026-08-19T18:00:00.000Z', 'Venceu ontem'],
    ['2026-08-23T18:00:00.000Z', 'Vence em 3 dias'],
    ['2026-08-15T18:00:00.000Z', 'Atrasada há 5 dias'],
  ])('descreve %s como "%s"', (isoDate, expected) => {
    expect(formatDueDateLabel(isoDate, { now: NOW })).toBe(expected)
  })

  it('cai para data absoluta quando está muito distante', () => {
    expect(
      formatDueDateLabel('2027-01-10T18:00:00.000Z', { now: NOW }),
    ).toMatch(/^Vence em \d{2}/)
  })

  describe('tarefa concluída', () => {
    it('troca urgência por registro histórico em vez de dizer "atrasada"', () => {
      expect(
        formatDueDateLabel('2026-08-15T18:00:00.000Z', {
          now: NOW,
          isDone: true,
        }),
      ).toMatch(/^Prazo: /)
    })

    it('vale também para prazo futuro', () => {
      expect(
        formatDueDateLabel('2026-08-23T18:00:00.000Z', {
          now: NOW,
          isDone: true,
        }),
      ).toMatch(/^Prazo: /)
    })

    it('segue devolvendo null quando não há prazo', () => {
      expect(formatDueDateLabel(null, { now: NOW, isDone: true })).toBeNull()
    })
  })

  it('compara por dia inteiro, ignorando a hora', () => {
    expect(formatDueDateLabel('2026-08-20T23:59:00.000Z', { now: NOW })).toBe(
      'Vence hoje',
    )
  })
})

describe('parseDateInput', () => {
  it('converte dd/mm/aaaa em ISO 8601', () => {
    expect(parseDateInput('15/09/2026')).toBe('2026-09-15T12:00:00.000Z')
  })

  it.each(['', '15/09', '2026-09-15', '15-09-2026', 'abc'])(
    'rejeita o formato "%s"',
    (input) => {
      expect(parseDateInput(input)).toBeNull()
    },
  )

  it('rejeita data que não existe no calendário', () => {
    expect(parseDateInput('31/02/2026')).toBeNull()
    expect(parseDateInput('32/01/2026')).toBeNull()
  })

  it('aceita 29 de fevereiro em ano bissexto', () => {
    expect(parseDateInput('29/02/2028')).not.toBeNull()
  })
})

describe('maskDateInput', () => {
  it.each([
    ['1', '1'],
    ['15', '15'],
    ['1509', '15/09'],
    ['15092026', '15/09/2026'],
  ])('formata "%s" como "%s"', (input, expected) => {
    expect(maskDateInput(input)).toBe(expected)
  })

  it('descarta dígitos além da data completa', () => {
    expect(maskDateInput('150920269999')).toBe('15/09/2026')
  })

  it('ignora caracteres não numéricos', () => {
    expect(maskDateInput('15a/b09c2026')).toBe('15/09/2026')
  })
})
