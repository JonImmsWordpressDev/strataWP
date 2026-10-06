// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { capturePages, viewportFor } from '../screenshots/capture'
import type { BrowserLike } from '../screenshots/capture'

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function fakeBrowser(options: { failOn?: string; failWith?: Error } = {}) {
  const log = {
    viewports: [] as Array<{ width: number; height: number }>,
    urls: [] as string[],
    scripts: [] as string[],
    closed: { pages: 0, contexts: 0, browser: 0 },
  }
  const browser: BrowserLike = {
    async newContext({ viewport }) {
      log.viewports.push(viewport)
      return {
        async newPage() {
          return {
            async goto(url) {
              log.urls.push(url)
              if (options.failOn && url.endsWith(options.failOn)) {
                throw options.failWith ?? new Error('net::ERR_TIMED_OUT')
              }
            },
            async evaluate(script) {
              log.scripts.push(script)
              return undefined
            },
            async screenshot() {
              return PNG
            },
            async close() {
              log.closed.pages++
            },
          }
        },
        async close() {
          log.closed.contexts++
        },
      }
    },
    async close() {
      log.closed.browser++
    },
  }
  return { browser, log }
}

const options = { baseUrl: 'http://localhost:8888', routes: ['/', '/blog/'], widths: [1280, 390] }
const reachable = async () => undefined

describe('viewportFor', () => {
  it('uses a desktop height from 768px up and a phone height below', () => {
    expect(viewportFor(1280)).toEqual({ width: 1280, height: 800 })
    expect(viewportFor(390)).toEqual({ width: 390, height: 844 })
  })
})

describe('capturePages', () => {
  it('captures every route at every width by plain concatenation, one context per width', async () => {
    const { browser, log } = fakeBrowser()
    const result = await capturePages(options, {
      launch: async () => browser,
      checkReachable: reachable,
    })
    expect(result.failures).toEqual([])
    expect(result.shots.map((shot) => shot.name)).toEqual([
      'home-1280.png',
      'home-390.png',
      'blog-1280.png',
      'blog-390.png',
    ])
    expect(log.urls).toEqual([
      'http://localhost:8888/',
      'http://localhost:8888/',
      'http://localhost:8888/blog/',
      'http://localhost:8888/blog/',
    ])
    expect(log.viewports).toHaveLength(2)
    expect(result.shots[0]?.png).toBe(PNG)
  })

  it('keeps going when one route fails and lists the failure', async () => {
    const { browser } = fakeBrowser({ failOn: '/blog/' })
    const result = await capturePages(options, {
      launch: async () => browser,
      checkReachable: reachable,
    })
    expect(result.shots.map((shot) => shot.name)).toEqual(['home-1280.png', 'home-390.png'])
    expect(result.failures).toEqual([
      { route: '/blog/', width: 1280, message: 'net::ERR_TIMED_OUT' },
      { route: '/blog/', width: 390, message: 'net::ERR_TIMED_OUT' },
    ])
  })

  it('closes every page, context and the browser even when pages throw', async () => {
    const { browser, log } = fakeBrowser({ failOn: '/' })
    await capturePages(options, { launch: async () => browser, checkReachable: reachable })
    expect(log.closed).toEqual({ pages: 4, contexts: 2, browser: 1 })
  })

  it('records a failure instead of throwing when a context cannot be created', async () => {
    const browser: BrowserLike = {
      async newContext() {
        throw new Error('context boom')
      },
      async close() {},
    }
    const result = await capturePages(
      { ...options, routes: ['/'], widths: [1280] },
      { launch: async () => browser, checkReachable: reachable }
    )
    expect(result.shots).toEqual([])
    expect(result.failures[0]?.message).toBe('context boom')
  })

  it('stops before launching a browser when the site is unreachable', async () => {
    let launched = false
    await expect(
      capturePages(options, {
        checkReachable: async () => {
          throw new Error('site is down')
        },
        launch: async () => {
          launched = true
          return fakeBrowser().browser
        },
      })
    ).rejects.toThrow('site is down')
    expect(launched).toBe(false)
  })

  it('propagates a launch failure unchanged', async () => {
    await expect(
      capturePages(options, {
        checkReachable: reachable,
        launch: async () => {
          throw new Error('Could not start Chromium (x)')
        },
      })
    ).rejects.toThrow('Could not start Chromium')
  })

  it('bounds the font wait so a stalled font load cannot hang the capture', async () => {
    const { browser, log } = fakeBrowser()
    await capturePages(options, { launch: async () => browser, checkReachable: reachable })
    expect(log.scripts.length).toBeGreaterThan(0)
    for (const script of log.scripts) {
      expect(script).toContain('Promise.race')
      expect(script).toContain('setTimeout')
    }
  })

  it('reports only the first line of a failure, without colour codes', async () => {
    const failWith = new Error(
      '\u001b[2mpage.goto:\u001b[22m Timeout 30000ms exceeded.\nCall log:\n  - navigating'
    )
    const { browser } = fakeBrowser({ failOn: '/blog/', failWith })
    const result = await capturePages(
      { ...options, routes: ['/blog/'], widths: [1280] },
      { launch: async () => browser, checkReachable: reachable }
    )
    expect(result.failures).toEqual([
      { route: '/blog/', width: 1280, message: 'page.goto: Timeout 30000ms exceeded.' },
    ])
  })
})
