import { ERROR_CODES, type ErrorEnvelope } from '@teams-tasks/shared'
import type { ErrorRequestHandler } from 'express'
import type { Logger } from '../../../application/ports/out/logger.port'
import {
  DomainError,
  type DomainErrorKind,
} from '../../../domain/shared/domain-errors'
import { RequestValidationError } from './request-validation.error'

const DOMAIN_KIND_TO_HTTP: Record<
  DomainErrorKind,
  { status: number; code: ErrorEnvelope['error']['code'] }
> = {
  VALIDATION: { status: 400, code: ERROR_CODES.VALIDATION_ERROR },
  NOT_FOUND: { status: 404, code: ERROR_CODES.NOT_FOUND },
  CONFLICT: { status: 409, code: ERROR_CODES.CONFLICT },
}

const BODY_PARSER_FAILURES: Record<
  string,
  { status: number; message: string }
> = {
  'entity.parse.failed': {
    status: 400,
    message: 'Corpo da requisicao nao e um JSON valido',
  },
  'entity.too.large': {
    status: 413,
    message: 'Corpo da requisicao excede o limite de 1 MB',
  },
  'request.aborted': {
    status: 400,
    message: 'A requisicao foi interrompida antes de ser recebida por inteiro',
  },
  'encoding.unsupported': {
    status: 415,
    message: 'Codificacao do corpo nao suportada',
  },
  'charset.unsupported': {
    status: 415,
    message: 'Charset do corpo nao suportado',
  },
}

interface ParserError {
  type?: unknown
}

function asBodyParserFailure(
  error: unknown,
): { status: number; message: string } | undefined {
  if (typeof error !== 'object' || error === null) return undefined

  const { type } = error as ParserError
  if (typeof type !== 'string') return undefined

  return BODY_PARSER_FAILURES[type]
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, _next) => {
    if (error instanceof RequestValidationError) {
      return res
        .status(400)
        .json(
          envelope(ERROR_CODES.VALIDATION_ERROR, error.message, error.details),
        )
    }

    const parserFailure = asBodyParserFailure(error)
    if (parserFailure) {
      return res
        .status(parserFailure.status)
        .json(envelope(ERROR_CODES.VALIDATION_ERROR, parserFailure.message))
    }

    if (error instanceof DomainError) {
      const { status, code } = DOMAIN_KIND_TO_HTTP[error.kind]

      return res
        .status(status)
        .json(envelope(code, error.message, error.details))
    }

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
