import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const r = (p: string) => resolve(import.meta.dirname, p)

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts', 'src/**/*.http.test.ts'],
    setupFiles: ['reflect-metadata', './src/tests/setup.schema.ts'],
    fileParallelism: true,
    pool: 'vmForks',
    testTimeout: 30000,
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
      '@presentation': r('src/presentation'),
      '@tests': r('src/tests'),
    },
  },
})
