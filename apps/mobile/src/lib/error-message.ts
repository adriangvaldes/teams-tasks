import { ApiError } from '@/api/api-error'

export const RETRY_LATER = 'Tente novamente em instantes.'

export function messageFromError(
  error: unknown,
  fallback = RETRY_LATER,
): string {
  return error instanceof ApiError ? error.userMessage : fallback
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.isNotFound
}
