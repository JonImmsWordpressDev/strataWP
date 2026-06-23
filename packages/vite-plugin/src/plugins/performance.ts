/**
 * Performance Orchestrator
 */
import type { Plugin } from 'vite'
import type { PerformanceOptions } from '../types'
import { strataWPCriticalCSS } from './critical-css'
import { strataWPImages } from './images'

export function strataWPPerformance(options: PerformanceOptions = {}): Plugin[] {
  const plugins: Plugin[] = []

  // Critical CSS — OFF by default (WS3 reimplements via beasties). Only added
  // when a theme explicitly opts in.
  if (options.criticalCSS === true || typeof options.criticalCSS === 'object') {
    const criticalOptions =
      typeof options.criticalCSS === 'object' ? options.criticalCSS : { enabled: true }
    plugins.push(strataWPCriticalCSS(criticalOptions))
  }

  // Image pipeline — ON by default.
  if (options.images !== false) {
    const imageOptions = typeof options.images === 'object' ? options.images : {}
    plugins.push(strataWPImages(imageOptions))
  }

  return plugins
}
