import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    snapshot: 'src/snapshot.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  shims: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: ['@modelcontextprotocol/sdk'],
})
