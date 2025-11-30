/**
 * Performance Orchestrator
 *
 * Combines all performance plugins with unified configuration
 */
import type { Plugin } from 'vite'
import type { PerformanceOptions } from '../types'
import { wpForgeCriticalCSS } from './critical-css'
import { wpForgeLazyLoading } from './lazy-loading'
import { wpForgePreload } from './preload'

export function wpForgePerformance(options: PerformanceOptions = {}): Plugin[] {
  const plugins: Plugin[] = []

  // Critical CSS
  if (options.criticalCSS !== false) {
    const criticalOptions = typeof options.criticalCSS === 'object'
      ? options.criticalCSS
      : { enabled: true }

    plugins.push(wpForgeCriticalCSS(criticalOptions))
  }

  // Lazy Loading
  if (options.lazyLoading !== false) {
    const lazyOptions = typeof options.lazyLoading === 'object'
      ? options.lazyLoading
      : { enabled: true }

    plugins.push(wpForgeLazyLoading(lazyOptions))
  }

  // Preload
  if (options.preload !== false) {
    const preloadOptions = typeof options.preload === 'object'
      ? options.preload
      : { enabled: true }

    plugins.push(wpForgePreload(preloadOptions))
  }

  return plugins
}
