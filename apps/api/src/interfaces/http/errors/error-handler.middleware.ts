import { ERROR_CODES, type ErrorEnvelope } from '@teams-tasks/shared'
import type { ErrorRequestHandler } from 'express'
import type { Logger } from '../../../application/ports/out/logger.port'
import {
  DomainError,
  type DomainErrorKind,
} from '../../../domain/shared/domain-errors'
import { RequestValidationError } from './request-validation.error'

/**
 * Traducao de erro -> HTTP. Este e o unico lugar do projeto que sabe que
 * "nao encontrado" e 404: o dominio expressa apenas a categoria semantica
 * (NOT_FOUND), preservando a regra de dependencia da arquitetura hexagonal.
 */
const DOMAIN_KIND_TO_HTTP: Record<
  DomainErrorKind,
  { status: number; code: ErrorEnvelope['error']['code'] }
> = {
  VALIDATION: { status: 400, code: ERROR_CODES.VALIDATION_ERROR },
  NOT_FOUND: { status: 404, code: ERROR_CODES.NOT_FOUND },
  CONFLICT: { status: 409, code: ERROR_CODES.CONFLICT },
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  // A assinatura de 4 parametros e o que faz o Express reconhecer isto como
  // middleware de erro - por isso `next` existe mesmo sem ser usado.
  return (error, req, res, _next) => {
    if (error instanceof RequestValidationError) {
      return res.status(400).json(
        envelope(ERROR_CODES.VALIDATION_ERROR, error.message, error.details),
      )
    }

    if (error instanceof DomainError) {
      const { status, code } = DOMAIN_KIND_TO_HTTP[error.kind]

      return res.status(status).json(envelope(code, error.message, error.details))
    }

    // Daqui para baixo e falha inesperada: loga com stack para investigacao,
    // mas NAO devolve detalhe interno ao cliente.
    logger.error('Erro nao tratado', {
      method: req.method,
      path: req.originalUrl,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return res
      .status(500)
      .json(envelope(ERROR_CODES.INTERNAL_ERROR, 'Erro interno do servidor'))
  }
}

function envelope(
  code: ErrorEnvelope['error']['code'],
  message: string,
  details?: ErrorEnvelope['error']['details'],
): ErrorEnvelope {
  return { error: { code, message, ...(details?.length ? { details } : {}) } }
}
