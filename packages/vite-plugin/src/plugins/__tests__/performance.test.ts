import { describe, it, expect } from 'vitest'
import { strataWPPerformance } from '../performance'

describe('strataWPPerformance defaults', () => {
  it('includes the images plugin and not the removed orphaned generators', () => {
    const names = strataWPPerformance().map((p) => p.name)
    expect(names).toContain('stratawp:images')
    expect(names).not.toContain('stratawp:preload')
    expect(names).not.toContain('stratawp:lazy-loading')
  })

  it('does not enable critical-css by default', () => {
    const names = strataWPPerformance().map((p) => p.name)
    expect(names).not.toContain('stratawp:critical-css')
  })

  it('adds critical-css only when explicitly enabled', () => {
    const names = strataWPPerformance({ criticalCSS: true }).map((p) => p.name)
    expect(names).toContain('stratawp:critical-css')
  })
})
