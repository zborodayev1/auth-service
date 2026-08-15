import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const r = (p: string) => resolve(import.meta.dirname, p)

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/*.integration.test.ts', '**/*.http.test.ts'],
    setupFiles: ['reflect-metadata'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**'],
    },
  },
  resolve: {
    alias: {
      '@app': r('src/application'),
      '@aggregates': r('src/domain/aggregates'),
      '@valueObjects': r('src/domain/valueObjects'),
      '@shared': r('src/shared'),
      '@infra': r('src/infrastructure'),
      '@libs': r('src/libs'),
      '@config': r('src/config'),
      '@ports': r('src/domain/ports'),
      '@factories': r('src/application/factories'),
      '@services': r('src/application/services'),
      '@generated': r('src/generated'),
      '@entities': r('src/domain/entities'),
      '@tests': r('src/tests'),
    },
  },
})
