import { defineConfig } from 'vitest/config'

/**
 * Duas suites separadas de proposito:
 *
 * unit        - dominio e casos de uso contra fakes em memoria. Sem Docker,
 *               sem banco, roda em milissegundos. E a suite do `pnpm test`.
 * integration - app Express real + Postgres real via supertest. Precisa do
 *               container de Postgres de pe e roda em serie (banco compartilhado).
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.spec.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.spec.ts'],
          globalSetup: ['tests/integration/global-setup.ts'],
          // Os arquivos compartilham o mesmo banco, entao rodam todos em um
          // unico fork, em serie: paralelizar faria o truncate de um arquivo
          // apagar os dados que outro acabou de inserir.
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/domain/**', 'src/application/**'],
      // Adapters sao cobertos pelos testes de integracao, nao por unit.
      exclude: ['src/**/*.port.ts', 'src/**/*.dto.ts'],
    },
  },
})
