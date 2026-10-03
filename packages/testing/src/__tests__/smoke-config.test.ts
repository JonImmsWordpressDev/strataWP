// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { resolveBrowsers } from '../browsers'
import { checkSiteReachable } from '../global-setup'
import { createSmokeConfig } from '../config'

describe('resolveBrowsers', () => {
  it('defaults to chromium only outside CI', () => {
    expect(resolveBrowsers({})).toEqual(['chromium'])
  })

  it('runs all three engines in CI', () => {
    expect(resolveBrowsers({ CI: 'true' })).toEqual(['chromium', 'firefox', 'webkit'])
  })

  it('lets STRATAWP_E2E_BROWSERS override everything', () => {
    const env = { CI: 'true', STRATAWP_E2E_BROWSERS: 'firefox, webkit' }
    expect(resolveBrowsers(env, ['chromium'])).toEqual(['firefox', 'webkit'])
  })

  it('ignores unknown names and falls through when none are valid', () => {
    expect(resolveBrowsers({ STRATAWP_E2E_BROWSERS: 'edge,safari' })).toEqual(['chromium'])
  })

  it('uses explicit browsers when no env override is set', () => {
    expect(resolveBrowsers({}, ['webkit'])).toEqual(['webkit'])
  })
})

describe('checkSiteReachable', () => {
  const ok = (async () => ({ ok: true, status: 200 })) as unknown as typeof fetch

  it('resolves when the site answers', async () => {
    await expect(checkSiteReachable('http://localhost:8888', ok)).resolves.toBeUndefined()
  })

  it('throws one actionable error on a bad status', async () => {
    const down = (async () => ({ ok: false, status: 502 })) as unknown as typeof fetch
    await expect(checkSiteReachable('http://localhost:8888', down)).rejects.toThrow(
      /http:\/\/localhost:8888 is not reachable \(HTTP 502\).*wp-env start.*WP_BASE_URL/s
    )
  })

  it('throws the same shape of error when the connection fails', async () => {
    const refused = (async () => {
      throw Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } })
    }) as unknown as typeof fetch
    await expect(checkSiteReachable('http://localhost:8888', refused)).rejects.toThrow(
      /not reachable \(fetch failed, ECONNREFUSED\)/
    )
  })
})

describe('createSmokeConfig', () => {
  it('builds one project per resolved browser', () => {
    const config = createSmokeConfig({ testDir: './e2e/smoke', browsers: ['firefox', 'webkit'] })
    expect((config.projects ?? []).map((p) => p.name)).toEqual(['firefox', 'webkit'])
  })

  it('points globalSetup at the compiled setup file and sets a baseURL', () => {
    const config = createSmokeConfig({ testDir: './e2e/smoke', baseURL: 'http://example.test' })
    expect(String(config.globalSetup)).toMatch(/global-setup\.js$/)
    expect(config.use?.baseURL).toBe('http://example.test')
  })
})
