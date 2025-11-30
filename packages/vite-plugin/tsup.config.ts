import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['vite', 'tailwindcss', 'autoprefixer', 'critical', '@unocss/vite', 'unocss'],
})
