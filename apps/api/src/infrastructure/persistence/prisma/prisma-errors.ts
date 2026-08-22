import { Prisma } from '@prisma/client'

export const PRISMA_ERROR = {
  UNIQUE_VIOLATION: 'P2002',
  FOREIGN_KEY_VIOLATION: 'P2003',
  RECORD_NOT_FOUND: 'P2025',
} as const

type PrismaErrorCode = (typeof PRISMA_ERROR)[keyof typeof PRISMA_ERROR]

export function isPrismaError(
  error: unknown,
  code: PrismaErrorCode,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  )
}

export function violatedFields(
  error: Prisma.PrismaClientKnownRequestError,
): string[] {
  const target = error.meta?.target

  if (Array.isArray(target)) return target.map(String)
  if (typeof target === 'string') return [target]

  return []
}
