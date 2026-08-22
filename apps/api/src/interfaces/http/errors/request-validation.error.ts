import type { ErrorDetail } from '@teams-tasks/shared'
import type { ZodError } from 'zod'

export class RequestValidationError extends Error {
  readonly details: ErrorDetail[]

  constructor(details: ErrorDetail[]) {
    super('Requisição inválida')
    this.name = 'RequestValidationError'
    this.details = details
  }

  static fromZodError(error: ZodError): RequestValidationError {
    return new RequestValidationError(
      error.issues.map((issue) => ({
        path: issue.path.join('.') || '(raiz)',
        message: issue.message,
      })),
    )
  }
}
