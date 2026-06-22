import fs from 'fs'
import path from 'path'
import type { Plugin, ResolvedConfig } from 'vite'
import type { AssetOptions } from '../types'

/**
 * Recursively copy a directory, rewriting CSS url() paths for font files.
 */
function copyIconsDir(srcDir: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true })

  const entries = fs.readdirSync(srcDir, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name)
    const destPath = path.join(destDir, entry.name)

    if (entry.isDirectory()) {
      copyIconsDir(srcPath, destPath)
    } else if (entry.name.endsWith('.css')) {
      // Rewrite font url() paths in CSS files
      let content = fs.readFileSync(srcPath, 'utf-8')
      content = content.replace(/url\(\s*['"]?\.\.\/fonts\//g, 'url(./fonts/')
      fs.writeFileSync(destPath, content, 'utf-8')
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * WordPress-compatible asset handling
 *
 * Ensures assets are output in WordPress-friendly structure
 * and can be properly enqueued by WordPress.
 *
 * Also handles the src/icons/ directory:
 * - Build: copies to dist/icons/ with CSS url() path normalization
 * - Dev: watches for changes and triggers full page reload
 */
export function strataWPAssets(options: AssetOptions = {}): Plugin {
  const { publicDir = 'dist', baseUrl } = options

  let rootDir: string

  return {
    name: 'stratawp:assets',

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

    configResolved(resolvedConfig: ResolvedConfig) {
      rootDir = resolvedConfig.root
    },

    writeBundle() {
      const iconsSrc = path.resolve(rootDir, 'src/icons')
      const iconsDest = path.resolve(rootDir, publicDir, 'icons')

      if (!fs.existsSync(iconsSrc)) {
        return
      }

      copyIconsDir(iconsSrc, iconsDest)
    },

    configureServer(server) {
      const iconsSrc = path.resolve(rootDir, 'src/icons')

      if (!fs.existsSync(iconsSrc)) {
        return
      }

      server.watcher.add(iconsSrc)

      server.watcher.on('change', (filePath) => {
        if (filePath.startsWith(iconsSrc)) {
          server.ws.send({ type: 'full-reload', path: '*' })
        }
      })

      server.watcher.on('add', (filePath) => {
        if (filePath.startsWith(iconsSrc)) {
          server.ws.send({ type: 'full-reload', path: '*' })
        }
      })
    },
  }
}
