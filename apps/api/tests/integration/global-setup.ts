import { execSync } from 'node:child_process'
import path from 'node:path'
import 'dotenv/config'
import type { TestProject } from 'vitest/node'

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

  execSync('pnpm exec prisma migrate deploy', {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  })

  project.provide('databaseUrl', databaseUrl)
}

function withSchema(connectionString: string, schema: string): string {
  const url = new URL(connectionString)
  url.searchParams.set('schema', schema)

  return url.toString()
}
