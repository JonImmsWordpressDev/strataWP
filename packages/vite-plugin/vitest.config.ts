import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/__tests__/**', '**/*.d.ts'],
      thresholds: {
        statements: 8,
        branches: 42,
        functions: 29,
        lines: 8,
      },
    },
  },
})
