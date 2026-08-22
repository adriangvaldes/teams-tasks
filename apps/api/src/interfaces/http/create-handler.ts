import type { ErrorDetail } from '@teams-tasks/shared'
import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'
import { RequestValidationError } from './errors/request-validation.error'

interface RequestSchemas<TBody, TQuery, TParams> {
  body?: ZodType<TBody>
  query?: ZodType<TQuery>
  params?: ZodType<TParams>
}

interface HandlerContext<TBody, TQuery, TParams> {
  body: TBody
  query: TQuery
  params: TParams
}

interface HandlerResult {
  status: number
  body?: unknown
}

export function createHandler<
  TBody = undefined,
  TQuery = undefined,
  TParams = undefined,
>(
  schemas: RequestSchemas<TBody, TQuery, TParams>,
  handle: (
    context: HandlerContext<TBody, TQuery, TParams>,
  ) => Promise<HandlerResult>,
): RequestHandler {
  return async (req, res) => {
    const details: ErrorDetail[] = []

    const body = parse(schemas.body, req.body, details)
    const query = parse(schemas.query, req.query, details)
    const params = parse(schemas.params, req.params, details)

    if (details.length > 0) {
      throw new RequestValidationError(details)
    }

    const result = await handle({
      body: body as TBody,
      query: query as TQuery,
      params: params as TParams,
    })

    if (result.body === undefined) {
      res.status(result.status).end()
      return
    }

    res.status(result.status).json(result.body)
  }
}

function parse<TValue>(
  schema: ZodType<TValue> | undefined,
  input: unknown,
  details: ErrorDetail[],
): TValue | undefined {
  if (!schema) return undefined

  const result = schema.safeParse(input)

  if (!result.success) {
    details.push(...RequestValidationError.fromZodError(result.error).details)
    return undefined
  }

  return result.data
}
