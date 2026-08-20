const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate))
}

export function formatDateInput(isoDate: string): string {
  return shortDateFormatter.format(new Date(isoDate))
}

/** Diferença em dias inteiros, comparando à meia-noite para não contar horas. */
function diffInDays(target: Date, reference: Date): number {
  const startOfTarget = Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate(),
  )
  const startOfReference = Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth(),
    reference.getUTCDate(),
  )

  return Math.round((startOfTarget - startOfReference) / 86_400_000)
}

/**
 * Rótulo do prazo em linguagem natural. "Vence em 3 dias" comunica urgência
 * bem melhor do que "01/09/2026" numa lista que se lê de relance.
 */
export function formatDueDateLabel(
  isoDate: string | null,
  now: Date = new Date(),
): string | null {
  if (!isoDate) return null

  const dueDate = new Date(isoDate)
  const days = diffInDays(dueDate, now)

  if (days === 0) return 'Vence hoje'
  if (days === 1) return 'Vence amanhã'
  if (days === -1) return 'Venceu ontem'
  if (days > 1 && days <= 7) return `Vence em ${days} dias`
  if (days < -1 && days >= -30) return `Atrasada há ${Math.abs(days)} dias`

  return `Vence em ${formatDate(isoDate)}`
}

/**
 * Converte a data digitada (dd/mm/aaaa) em ISO 8601, que é o formato do
 * contrato da API. Devolve null quando o texto ainda não forma uma data válida.
 */
export function parseDateInput(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  const parsed = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0),
  )

  if (Number.isNaN(parsed.getTime())) return null

  // Rejeita datas inexistentes como 31/02, que o Date "corrige" silenciosamente.
  if (parsed.getUTCDate() !== Number(day)) return null
  if (parsed.getUTCMonth() !== Number(month) - 1) return null

  return parsed.toISOString()
}

/** Máscara progressiva dd/mm/aaaa conforme o usuário digita. */
export function maskDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)

  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}
