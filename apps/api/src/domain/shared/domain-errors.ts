export type DomainErrorKind = 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT'

export interface DomainErrorDetail {
  path: string
  message: string
}

export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind
  readonly details?: DomainErrorDetail[]

  protected constructor(message: string, details?: DomainErrorDetail[]) {
    super(message)
    this.name = new.target.name
    if (details) {
      this.details = details
    }
  }
}

export abstract class ValidationError extends DomainError {
  readonly kind = 'VALIDATION' as const
}

export abstract class NotFoundError extends DomainError {
  readonly kind = 'NOT_FOUND' as const
}

export abstract class ConflictError extends DomainError {
  readonly kind = 'CONFLICT' as const
}

export class InvalidUuidError extends ValidationError {
  constructor(received: string) {
    super(`"${received}" não é um UUID válido`, [
      { path: 'id', message: 'Deve ser um UUID válido' },
    ])
  }
}
