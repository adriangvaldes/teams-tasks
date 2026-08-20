import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // O pacote @teams-tasks/shared e distribuido como fonte TypeScript.
  // Faze-lo entrar no bundle evita passo de build extra no monorepo e no Docker.
  noExternal: ['@teams-tasks/shared'],
})
