import type {
  LogContext,
  Logger,
} from '../../src/application/ports/out/logger.port'

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context?: LogContext
}

/** Logger silencioso que guarda o que foi registrado, para asserts opcionais. */
export class RecordingLogger implements Logger {
  readonly entries: LogEntry[] = []

  debug(message: string, context?: LogContext): void {
    this.record('debug', message, context)
  }

  info(message: string, context?: LogContext): void {
    this.record('info', message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.record('warn', message, context)
  }

  error(message: string, context?: LogContext): void {
    this.record('error', message, context)
  }

  private record(
    level: LogEntry['level'],
    message: string,
    context?: LogContext,
  ): void {
    this.entries.push(
      context ? { level, message, context } : { level, message },
    )
  }
}
