export type LogContext = Record<string, unknown>

/**
 * Porta de saida de logging. A aplicacao nao conhece Pino: trocar de biblioteca
 * (ou silenciar tudo em teste) e implementar esta interface.
 */
export interface Logger {
  debug(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, context?: LogContext): void
}
