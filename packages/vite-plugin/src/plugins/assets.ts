import type { Plugin } from 'vite'
import type { AssetOptions } from '../types'

/**
 * WordPress-compatible asset handling
 *
 * Ensures assets are output in WordPress-friendly structure
 * and can be properly enqueued by WordPress.
 */
export function wpForgeAssets(options: AssetOptions = {}): Plugin {
  const {
    publicDir = 'dist',
    baseUrl,
  } = options

  return {
    name: 'wp-forge:assets',

    config() {
      return {
        publicDir: publicDir,
        base: baseUrl || './',

        build: {
          // Output to WordPress theme structure
          outDir: publicDir,
          emptyOutDir: false, // Don't delete PHP files

          // Asset handling
          assetsDir: '',
          assetsInlineLimit: 0, // Don't inline assets

          // Sourcemaps for debugging
          sourcemap: true,
        },
      }
    },
  }
}
