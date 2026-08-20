import pino, { type Logger as PinoInstance } from 'pino'
import type {
  LogContext,
  Logger,
} from '../../application/ports/out/logger.port'
import type { Env } from '../config/env'

/**
 * Adapter de saida da porta Logger. Em desenvolvimento usa pino-pretty para
 * legibilidade; em producao emite JSON estruturado, que e o formato que
 * agregadores (Datadog, Loki, CloudWatch) sabem indexar.
 */
export class PinoLogger implements Logger {
  private constructor(private readonly logger: PinoInstance) {}

  static create(env: Env): PinoLogger {
    const isDevelopment = env.NODE_ENV === 'development'

    return new PinoLogger(
      pino({
        level: env.LOG_LEVEL,
        ...(isDevelopment
          ? {
              transport: {
                target: 'pino-pretty',
                options: { colorize: true, translateTime: 'HH:MM:ss' },
              },
            }
          : {}),
        // Nunca vaze credenciais nos logs.
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      }),
    )
  }

  /** Expoe a instancia crua apenas para o middleware pino-http. */
  get instance(): PinoInstance {
    return this.logger
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(context ?? {}, message)
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(context ?? {}, message)
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(context ?? {}, message)
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(context ?? {}, message)
  }
}
