import type { Plugin, ResolvedConfig } from 'vite'
import { strataWPBlocks } from './plugins/blocks'
import { strataWPManifest } from './plugins/manifest'
import { strataWPPhpHmr } from './plugins/php-hmr'
import { strataWPAssets } from './plugins/assets'
import { strataWPDesignSystem } from './plugins/design-system'
import { strataWPPerformance } from './plugins/performance'
import type { StrataWPPluginOptions } from './types'

/**
 * StrataWP Vite Plugin
 *
 * Provides WordPress-specific build optimizations and development features:
 * - Block auto-discovery and registration
 * - Asset manifest generation for WordPress
 * - PHP file watching with HMR
 * - WordPress-compatible asset URLs
 */
export function strataWP(options: StrataWPPluginOptions = {}): Plugin[] {
  const {
    blocks = {
      dir: 'src/blocks',
      autoRegister: true,
    },
    manifest = {
      enabled: true,
      output: 'dist/.vite/manifest.json',
    },
    phpHmr = {
      enabled: true,
      watch: ['**/*.php', 'theme.json'],
    },
    assets = {
      publicDir: 'dist',
    },
    designSystem = {
      enabled: false,
      framework: 'none',
    },
    performance = {
      criticalCSS: true,
      lazyLoading: true,
      preload: true,
    },
  } = options

  const plugins: Plugin[] = [
    strataWPCore(options),
    strataWPBlocks(blocks),
    strataWPManifest(manifest),
    strataWPPhpHmr(phpHmr),
    strataWPAssets(assets),
  ]

  // Add design system plugin if enabled
  if (designSystem.enabled) {
    plugins.push(strataWPDesignSystem(designSystem))
  }

  // Add performance plugins
  plugins.push(...strataWPPerformance(performance))

  return plugins
}

/**
 * Core StrataWP plugin
 */
function strataWPCore(_options: StrataWPPluginOptions): Plugin {
  let config: ResolvedConfig

  return {
    name: 'stratawp',

    config() {
      return {
        // WordPress-friendly build config
        build: {
          manifest: true,
          rollupOptions: {
            output: {
              entryFileNames: 'js/[name].[hash].js',
              chunkFileNames: 'js/[name].[hash].js',
              assetFileNames: (assetInfo) => {
                const name = assetInfo.name || ''
                if (/\.(css)$/.test(name)) {
                  return 'css/[name].[hash][extname]'
                }
                if (/\.(png|jpe?g|svg|gif|webp|avif)$/.test(name)) {
                  return 'images/[name].[hash][extname]'
                }
                if (/\.(woff2?|eot|ttf|otf)$/.test(name)) {
                  return 'fonts/[name].[hash][extname]'
                }
                return 'assets/[name].[hash][extname]'
              },
            },
          },
        },

        // Optimize deps for WordPress
        optimizeDeps: {
          include: [
            '@wordpress/blocks',
            '@wordpress/block-editor',
            '@wordpress/components',
            '@wordpress/data',
            '@wordpress/element',
            '@wordpress/i18n',
          ],
        },
      }
    },

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    configureServer(server) {
      // Log WordPress-specific info
      server.httpServer?.once('listening', () => {
        setTimeout(() => {
          const { logger } = config
          logger.info('\n  ⚡ StrataWP Dev Server Ready!\n')
          logger.info('  WordPress integration active')
          logger.info('  Block auto-discovery enabled')
          logger.info('  PHP HMR watching for changes\n')
        }, 100)
      })
    },
  }
}

export * from './types'
export { strataWPBlocks, strataWPManifest, strataWPPhpHmr, strataWPAssets, strataWPDesignSystem, strataWPPerformance }
export { strataWPTailwindPreset } from './integrations/tailwind-preset'
export { strataWPUnoPreset } from './integrations/unocss-preset'
