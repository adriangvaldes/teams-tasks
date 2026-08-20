import type { ErrorCode, ErrorDetail } from '@teams-tasks/shared'

/**
 * Erro tipado da API, construido a partir do envelope
 * { error: { code, message, details? } } que o backend garante em toda falha.
 */
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

  /**
   * Converte `details` no formato que o react-hook-form espera, para que um
   * 409 de nome duplicado apareca embaixo do campo `name` em vez de num alerta
   * generico. E o retorno pratico de o backend devolver o path de cada erro.
   */
  get fieldErrors(): Record<string, string> {
    return this.details.reduce<Record<string, string>>((acc, detail) => {
      if (!acc[detail.path]) acc[detail.path] = detail.message
      return acc
    }, {})
  }

  /** Mensagem pronta para exibir ao usuario final. */
  get userMessage(): string {
    if (this.isNetwork) {
      return 'Nao foi possivel falar com o servidor. Verifique se a API esta rodando.'
    }

    return this.message
  }
}
