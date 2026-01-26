import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'database/index': 'src/database/index.ts',
    'snapshots/index': 'src/snapshots/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['better-sqlite3'],
})
