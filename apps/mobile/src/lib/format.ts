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

interface DueDateLabelOptions {
  now?: Date

  isDone?: boolean
}

export function formatDueDateLabel(
  isoDate: string | null,
  { now = new Date(), isDone = false }: DueDateLabelOptions = {},
): string | null {
  if (!isoDate) return null

  if (isDone) return `Prazo: ${formatDate(isoDate)}`

  const dueDate = new Date(isoDate)
  const days = diffInDays(dueDate, now)

  if (days === 0) return 'Vence hoje'
  if (days === 1) return 'Vence amanhã'
  if (days === -1) return 'Venceu ontem'
  if (days > 1 && days <= 7) return `Vence em ${days} dias`
  if (days < -1 && days >= -30) return `Atrasada há ${Math.abs(days)} dias`

  return `Vence em ${formatDate(isoDate)}`
}

export function parseDateInput(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match
  const parsed = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0),
  )

  if (Number.isNaN(parsed.getTime())) return null

  if (parsed.getUTCDate() !== Number(day)) return null
  if (parsed.getUTCMonth() !== Number(month) - 1) return null

  return parsed.toISOString()
}

export function maskDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)

  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}
