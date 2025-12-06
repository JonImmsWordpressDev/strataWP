import type { Plugin, ViteDevServer } from 'vite'
import { watch } from 'chokidar'
import pc from 'picocolors'
import type { PhpHmrOptions } from '../types'

/**
 * Watch PHP files and trigger HMR
 *
 * This allows developers to see changes to PHP templates and theme files
 * without manually refreshing the browser.
 */
export function strataWPPhpHmr(options: PhpHmrOptions = {}): Plugin {
  const {
    enabled = true,
    watch: patterns = ['**/*.php', 'theme.json'],
    debounce = 100,
  } = options

  let server: ViteDevServer
  let watcher: ReturnType<typeof watch> | null = null
  let timeout: NodeJS.Timeout | null = null

  return {
    name: 'stratawp:php-hmr',

    configureServer(devServer) {
      if (!enabled) return

      server = devServer

      // Watch PHP files
      watcher = watch(patterns, {
        ignored: ['**/node_modules/**', '**/vendor/**', '**/dist/**'],
        persistent: true,
        ignoreInitial: true,
      })

      watcher.on('change', (path) => {
        // Debounce to avoid too many reloads
        if (timeout) clearTimeout(timeout)

        timeout = setTimeout(() => {
          console.log(pc.cyan(`\n  ⚒️  PHP file changed: ${pc.dim(path)}`))
          console.log(pc.cyan('  Reloading page...\n'))

          // Send full reload to browser
          server.ws.send({
            type: 'full-reload',
            path: '*',
          })
        }, debounce)
      })

      watcher.on('add', (path) => {
        console.log(pc.green(`\n  ⚒️  New PHP file: ${pc.dim(path)}\n`))
      })

      watcher.on('unlink', (path) => {
        console.log(pc.yellow(`\n  ⚒️  PHP file removed: ${pc.dim(path)}\n`))
      })

      // Log when PHP HMR is ready
      server.httpServer?.once('listening', () => {
        setTimeout(() => {
          console.log(pc.dim('  📝 Watching PHP files for changes...'))
        }, 150)
      })
    },

    async closeBundle() {
      if (watcher) {
        await watcher.close()
        watcher = null
      }
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
    },
  }
}
