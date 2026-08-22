import type { ErrorCode, ErrorDetail } from '@teams-tasks/shared'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static network(message: string): ApiError {
    return new ApiError(0, 'NETWORK_ERROR', message)
  }

  get isValidation(): boolean {
    return this.code === 'VALIDATION_ERROR'
  }

  get isNotFound(): boolean {
    return this.code === 'NOT_FOUND'
  }

  get isConflict(): boolean {
    return this.code === 'CONFLICT'
  }

  get isNetwork(): boolean {
    return this.code === 'NETWORK_ERROR'
  }

  get fieldErrors(): Record<string, string> {
    return this.details.reduce<Record<string, string>>((acc, detail) => {
      if (!acc[detail.path]) acc[detail.path] = detail.message
      return acc
    }, {})
  }

  get userMessage(): string {
    if (this.isNetwork) {
      return 'Nao foi possivel falar com o servidor. Verifique se a API esta rodando.'
    }

    return this.message
  }
}
