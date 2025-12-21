import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/mocks/**',
        '**/*.config.{ts,js}',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'build'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@wordpress/blocks': path.resolve(__dirname, './src/mocks/wordpress.ts'),
      '@wordpress/data': path.resolve(__dirname, './src/mocks/wordpress.ts'),
      '@wordpress/i18n': path.resolve(__dirname, './src/mocks/wordpress.ts'),
      '@wordpress/components': path.resolve(__dirname, './src/mocks/wordpress.ts'),
      '@wordpress/block-editor': path.resolve(__dirname, './src/mocks/wordpress.ts'),
      '@wordpress/element': path.resolve(__dirname, './src/mocks/wordpress.ts'),
    },
  },
})
