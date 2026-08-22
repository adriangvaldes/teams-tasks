export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export interface ErrorDetail {
  path: string
  message: string
}

export interface ErrorEnvelope {
  error: {
    code: ErrorCode
    message: string
    details?: ErrorDetail[]
  }
}

export interface SuccessEnvelope<TData, TMeta = never> {
  data: TData
  meta?: TMeta
}

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ErrorEnvelope).error?.code === 'string'
  )
}
