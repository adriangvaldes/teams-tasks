import { execSync } from 'node:child_process'
import path from 'node:path'
import 'dotenv/config'
import type { TestProject } from 'vitest/node'

/**
 * Os testes de integracao usam o MESMO container de Postgres do desenvolvimento,
 * mas em um schema separado. Isso evita pedir ao avaliador um segundo banco e,
 * ao mesmo tempo, garante que rodar a suite nunca apague os dados do seed.
 */
const TEST_SCHEMA = 'integration_test'

declare module 'vitest' {
  interface ProvidedContext {
    databaseUrl: string
  }
}

export default function setup(project: TestProject): void {
  const baseUrl = process.env.DATABASE_URL

  if (!baseUrl) {
    throw new Error(
      'DATABASE_URL ausente. Copie apps/api/.env.example para apps/api/.env ' +
        'e suba o banco com `pnpm db:up` antes de rodar os testes de integracao.',
    )
  }

  const databaseUrl = withSchema(baseUrl, TEST_SCHEMA)
  const apiRoot = path.resolve(import.meta.dirname, '..', '..')

  // `migrate deploy` (e nao `migrate dev`) porque aqui as migrations apenas
  // sao APLICADAS: e o mesmo comando que roda em producao, o que faz a suite
  // validar de fato os arquivos de migration versionados.
  execSync('pnpm exec prisma migrate deploy', {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  })

  // provide/inject e o caminho suportado pelo Vitest para levar valores do
  // global setup aos workers - mutar process.env aqui nao e garantido.
  project.provide('databaseUrl', databaseUrl)
}

function withSchema(connectionString: string, schema: string): string {
  const url = new URL(connectionString)
  url.searchParams.set('schema', schema)

  return url.toString()
}
