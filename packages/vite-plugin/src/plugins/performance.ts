/**
 * Performance Orchestrator
 *
 * Combines all performance plugins with unified configuration
 */
import type { Plugin } from 'vite'
import type { PerformanceOptions } from '../types'
import { strataWPCriticalCSS } from './critical-css'
import { strataWPLazyLoading } from './lazy-loading'
import { strataWPPreload } from './preload'

export function strataWPPerformance(options: PerformanceOptions = {}): Plugin[] {
  const plugins: Plugin[] = []

  // Critical CSS
  if (options.criticalCSS !== false) {
    const criticalOptions = typeof options.criticalCSS === 'object'
      ? options.criticalCSS
      : { enabled: true }

    plugins.push(strataWPCriticalCSS(criticalOptions))
  }

  // Lazy Loading
  if (options.lazyLoading !== false) {
    const lazyOptions = typeof options.lazyLoading === 'object'
      ? options.lazyLoading
      : { enabled: true }

    plugins.push(strataWPLazyLoading(lazyOptions))
  }

  // Preload
  if (options.preload !== false) {
    const preloadOptions = typeof options.preload === 'object'
      ? options.preload
      : { enabled: true }

    plugins.push(strataWPPreload(preloadOptions))
  }

  return plugins
}
