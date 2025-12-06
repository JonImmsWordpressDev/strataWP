/**
 * Design System Integration Plugin
 *
 * Integrates Tailwind CSS or UnoCSS with WordPress themes
 */
import type { Plugin, ResolvedConfig } from 'vite'
import type { DesignSystemOptions } from '../types'
import path from 'path'
import fs from 'fs'

export function strataWPDesignSystem(options: DesignSystemOptions = {}): Plugin {
  const {
    enabled = false,
    framework = 'none',
    wordpressPresets = true,
  } = options

  if (!enabled || framework === 'none') {
    return {
      name: 'stratawp:design-system',
      apply: () => false,
    }
  }

  let config: ResolvedConfig

  return {
    name: 'stratawp:design-system',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    async config() {
      const root = process.cwd()

      // Check for framework config files
      const tailwindConfig = path.join(root, 'tailwind.config.js')
      const tailwindConfigTs = path.join(root, 'tailwind.config.ts')
      const unoConfig = path.join(root, 'uno.config.ts')

      const hasTailwindConfig = fs.existsSync(tailwindConfig) || fs.existsSync(tailwindConfigTs)
      const hasUnoConfig = fs.existsSync(unoConfig)

      if (framework === 'tailwind' && !hasTailwindConfig) {
        console.warn(
          '⚠️  Tailwind CSS enabled but no config file found. Run: stratawp design-system:setup tailwind'
        )
      }

      if (framework === 'unocss' && !hasUnoConfig) {
        console.warn(
          '⚠️  UnoCSS enabled but no config file found. Run: stratawp design-system:setup unocss'
        )
      }

      // Configure PostCSS for Tailwind
      if (framework === 'tailwind') {
        try {
          const tailwindcss = require('tailwindcss')
          const autoprefixer = require('autoprefixer')

          return {
            css: {
              postcss: {
                plugins: [tailwindcss, autoprefixer],
              },
            },
          }
        } catch {
          console.warn('⚠️  Tailwind CSS dependencies not found')
        }
      }

      // UnoCSS is added as a separate plugin by the user
      return {}
    },

    configureServer(server) {
      const { logger } = config

      server.httpServer?.once('listening', () => {
        setTimeout(() => {
          if (framework === 'tailwind') {
            logger.info('  🎨 Tailwind CSS integration active')
            if (wordpressPresets) {
              logger.info('  📝 WordPress preset mappings enabled')
            }
          } else if (framework === 'unocss') {
            logger.info('  🎨 UnoCSS integration active')
            if (wordpressPresets) {
              logger.info('  📝 WordPress preset mappings enabled')
            }
          }
        }, 150)
      })
    },

    async transform(code, id) {
      // Inject WordPress CSS variable mappings if needed
      if (wordpressPresets && id.endsWith('.css') && (framework === 'tailwind' || framework === 'unocss')) {
        // Check if theme.json exists
        const themeJsonPath = path.join(process.cwd(), 'theme.json')
        if (fs.existsSync(themeJsonPath)) {
          try {
            const themeJson = JSON.parse(fs.readFileSync(themeJsonPath, 'utf-8'))

            // Add CSS custom properties from theme.json
            if (themeJson.settings?.color?.palette) {
              let injectedVars = '\n/* WordPress Color Variables */\n:root {\n'
              themeJson.settings.color.palette.forEach((color: any) => {
                injectedVars += `  --wp--preset--color--${color.slug}: ${color.color};\n`
              })
              injectedVars += '}\n'

              code = injectedVars + code
            }
          } catch {
            // Silently fail if theme.json parsing fails
          }
        }
      }

      return code
    },
  }
}
