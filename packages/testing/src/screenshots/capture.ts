import { checkSiteReachable } from '../global-setup'
import { planShots } from './naming'
import type { CaptureOptions } from './options'

/** The slice of Playwright the capture loop uses, so tests can fake it without a browser. */
export interface PageLike {
  goto(url: string, options: { waitUntil: 'load'; timeout: number }): Promise<unknown>
  evaluate(script: string): Promise<unknown>
  screenshot(options: { type: 'png'; fullPage: boolean }): Promise<Uint8Array>
  close(): Promise<void>
}

export interface ContextLike {
  newPage(): Promise<PageLike>
  close(): Promise<void>
}

export interface BrowserLike {
  newContext(options: { viewport: { width: number; height: number } }): Promise<ContextLike>
  close(): Promise<void>
}

export interface CaptureDeps {
  launch: () => Promise<BrowserLike>
  checkReachable: (url: string) => Promise<void>
}

export interface Shot {
  route: string
  width: number
  name: string
  png: Uint8Array
}

export interface CaptureFailure {
  route: string
  width: number
  message: string
}

export interface CaptureResult {
  shots: Shot[]
  failures: CaptureFailure[]
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function viewportFor(width: number): { width: number; height: number } {
  return { width, height: width >= 768 ? 800 : 844 }
}

/**
 * Playwright is an optional peer, so it is loaded here and only here. Importing
 * this module must never fail because Playwright is missing.
 */
export async function launchChromium(): Promise<BrowserLike> {
  let playwright: typeof import('@playwright/test')
  try {
    playwright = await import('@playwright/test')
  } catch {
    throw new Error('Screenshots need Playwright. Install it with: pnpm add -D @playwright/test')
  }
  try {
    return (await playwright.chromium.launch()) as unknown as BrowserLike
  } catch (error) {
    throw new Error(
      `Could not start Chromium (${errorMessage(error)}). ` +
        'Install the browser with: pnpm exec playwright install chromium'
    )
  }
}

/**
 * Captures viewport-sized PNGs. One failing route or width is recorded and the
 * rest continue; an unreachable site or a missing browser throws once, up front.
 */
export async function capturePages(
  options: CaptureOptions,
  deps: Partial<CaptureDeps> = {}
): Promise<CaptureResult> {
  const checkReachable =
    deps.checkReachable ?? ((url: string) => checkSiteReachable(url, fetch, 'screenshots'))
  const launch = deps.launch ?? launchChromium

  await checkReachable(options.baseUrl)
  const browser = await launch()
  const contexts = new Map<number, ContextLike>()
  const result: CaptureResult = { shots: [], failures: [] }

  try {
    for (const planned of planShots(options.routes, options.widths)) {
      let page: PageLike | undefined
      try {
        let context = contexts.get(planned.width)
        if (!context) {
          context = await browser.newContext({ viewport: viewportFor(planned.width) })
          contexts.set(planned.width, context)
        }
        page = await context.newPage()
        await page.goto(`${options.baseUrl}${planned.route}`, {
          waitUntil: 'load',
          timeout: 30_000,
        })
        await page.evaluate('document.fonts.ready.then(() => undefined)')
        const png = await page.screenshot({ type: 'png', fullPage: false })
        result.shots.push({ ...planned, png })
      } catch (error) {
        result.failures.push({
          route: planned.route,
          width: planned.width,
          message: errorMessage(error),
        })
      } finally {
        await page?.close().catch(() => undefined)
      }
    }
  } finally {
    for (const context of contexts.values()) {
      await context.close().catch(() => undefined)
    }
    await browser.close().catch(() => undefined)
  }
  return result
}
