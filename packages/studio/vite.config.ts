import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import externalGlobals from 'rollup-plugin-external-globals'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic',
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/index.ts'),
        gutenberg: resolve(__dirname, 'src/gutenberg/index.ts'),
      },
      external: [
        'react',
        'react-dom',
        '@wordpress/element',
        '@wordpress/components',
        '@wordpress/i18n',
        '@wordpress/api-fetch',
        '@wordpress/data',
        '@wordpress/blocks',
        '@wordpress/block-editor',
        '@wordpress/plugins',
        '@wordpress/notices',
        // Note: @wordpress/icons is NOT external - it's bundled because
        // WordPress doesn't provide wp.icons as a standalone global
      ],
      plugins: [
        externalGlobals({
          'react': 'React',
          'react-dom': 'ReactDOM',
          '@wordpress/element': 'wp.element',
          '@wordpress/components': 'wp.components',
          '@wordpress/i18n': 'wp.i18n',
          '@wordpress/api-fetch': 'wp.apiFetch',
          '@wordpress/data': 'wp.data',
          '@wordpress/blocks': 'wp.blocks',
          '@wordpress/block-editor': 'wp.blockEditor',
          '@wordpress/plugins': 'wp.plugins',
          '@wordpress/notices': 'wp.notices',
          // Note: @wordpress/icons is NOT mapped - it's bundled
        }),
      ],
      output: {
        entryFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'style.css'
          }
          return 'assets/[name]-[hash][extname]'
        },
        // Disable code splitting to keep everything in single files
        manualChunks: undefined,
      },
    },
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
