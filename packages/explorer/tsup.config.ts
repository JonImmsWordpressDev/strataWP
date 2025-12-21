import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'express',
    'vite',
    'chokidar',
    'ws',
    'react',
    'react-dom',
    'chalk',
    'ora',
    'open',
    'fs-extra',
    'fast-glob',
  ],
})
