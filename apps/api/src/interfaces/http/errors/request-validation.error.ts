import type { ErrorDetail } from '@teams-tasks/shared'
import type { ZodError } from 'zod'

/**
 * Erro de validacao de REQUISICAO (formato do payload HTTP), distinto dos
 * erros de dominio (regra de negocio). Vive na camada de interface porque
 * "body malformado" e um conceito de transporte, nao de negocio.
 */
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
        // O path e mantido "cru" (title, teamIds.0) para que o formulario do
        // mobile consiga associar a mensagem ao campo correspondente.
        path: issue.path.join('.') || '(raiz)',
        message: issue.message,
      })),
    )
  }
}
