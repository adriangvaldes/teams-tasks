import { z } from 'zod'

/**
 * Validacao de configuracao na BORDA do processo. Se uma variavel obrigatoria
 * faltar, o servidor nao sobe "meio funcionando": ele falha imediatamente com
 * uma mensagem legivel. Nenhuma outra camada le process.env.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce.number().int().min(1).max(65535).default(3333),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL e obrigatoria (veja apps/api/.env.example)'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  /** Lista separada por virgula, ou '*' para liberar todas as origens. */
  CORS_ORIGIN: z.string().default('*'),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source)

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(`Configuracao de ambiente invalida:\n${issues}`)
  }

  return result.data
}

export function parseCorsOrigin(value: string): string[] | '*' {
  if (value.trim() === '*') return '*'

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}
