// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { createVisualConfig } from '../config'

const original = process.env.WP_BASE_URL

afterEach(() => {
  if (original === undefined) delete process.env.WP_BASE_URL
  else process.env.WP_BASE_URL = original
})

describe('createVisualConfig', () => {
  it('runs Chromium only, on one worker, with baselines next to the specs', () => {
    const config = createVisualConfig({ testDir: './e2e/visual' })
    expect(config.projects?.map((project) => project.name)).toEqual(['chromium'])
    expect(config.workers).toBe(1)
    expect(config.testDir).toBe('./e2e/visual')
    expect(config.snapshotPathTemplate).toBe('{testDir}/__screenshots__/{testFileName}/{arg}{ext}')
  })

  it('defaults maxDiffPixelRatio to 0.01, disables animations, and accepts an override', () => {
    const base = createVisualConfig({ testDir: '.' })
    expect(base.expect?.toHaveScreenshot?.maxDiffPixelRatio).toBe(0.01)
    expect(base.expect?.toHaveScreenshot?.animations).toBe('disabled')
    const loose = createVisualConfig({ testDir: '.', maxDiffPixelRatio: 0.05 })
    expect(loose.expect?.toHaveScreenshot?.maxDiffPixelRatio).toBe(0.05)
  })

  it.each([-0.1, 1.5, Number.NaN])('rejects maxDiffPixelRatio %s', (ratio) => {
    expect(() => createVisualConfig({ testDir: '.', maxDiffPixelRatio: ratio })).toThrow(
      /maxDiffPixelRatio/
    )
  })

  it('resolves the base URL from the option, then WP_BASE_URL, then wp-env', () => {
    delete process.env.WP_BASE_URL
    expect(createVisualConfig({ testDir: '.' }).use?.baseURL).toBe('http://localhost:8888')
    process.env.WP_BASE_URL = 'http://env.test'
    expect(createVisualConfig({ testDir: '.' }).use?.baseURL).toBe('http://env.test')
    expect(createVisualConfig({ testDir: '.', baseURL: 'http://opt.test' }).use?.baseURL).toBe(
      'http://opt.test'
    )
  })

  it('does not retry (a retry would hide a flaky baseline)', () => {
    expect(createVisualConfig({ testDir: '.' }).retries).toBe(0)
  })
})
