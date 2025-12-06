import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { strataWP } from '@stratawp/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    strataWP({
      blocks: {
        dir: 'src/blocks',
        autoRegister: true,
        namespace: 'forge-basic',
      },
      phpHmr: {
        enabled: true,
        watch: ['**/*.php', 'theme.json', 'templates/**/*', 'parts/**/*'],
      },
      manifest: {
        enabled: true,
        wordpress: true,
      },
    }),
  ],

  build: {
    rollupOptions: {
      input: {
        main: './src/js/main.ts',
        editor: './src/js/editor.ts',
      },
    },
  },

  server: {
    port: 3000,
    strictPort: true,
    cors: true,
    host: 'localhost',
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
    origin: 'http://localhost:3000',
  },
})
