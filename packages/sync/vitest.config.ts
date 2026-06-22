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
        statements: 79,
        branches: 82,
        functions: 74,
        lines: 79,
      },
    },
  },
  resolve: {
    alias: {
      // Allow .js imports to resolve to .ts files
    },
  },
})
