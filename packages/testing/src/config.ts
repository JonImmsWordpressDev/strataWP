import { defineConfig, devices } from '@playwright/test'
import type { PlaywrightTestConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { resolveBrowsers } from './browsers'
import type { SmokeBrowser } from './browsers'

export type { SmokeBrowser } from './browsers'

export interface SmokeConfigOptions {
  /** Directory containing the smoke specs, relative to the config file. */
  testDir: string
  /** Defaults to WP_BASE_URL, then the wp-env URL. */
  baseURL?: string
  /** Engines to run; STRATAWP_E2E_BROWSERS overrides this. */
  browsers?: SmokeBrowser[]
}

const DEVICES = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
} as const

const GLOBAL_SETUP = fileURLToPath(new URL('./global-setup.js', import.meta.url))

function resolveBaseURL(baseURL?: string): string {
  return baseURL ?? process.env.WP_BASE_URL ?? 'http://localhost:8888'
}

/**
 * One Playwright definition shared by the monorepo and generated themes.
 * Chromium locally for speed; Chromium + Firefox + WebKit in CI.
 */
export function createSmokeConfig(options: SmokeConfigOptions): PlaywrightTestConfig {
  const baseURL = resolveBaseURL(options.baseURL)

  return defineConfig({
    testDir: options.testDir,
    timeout: 30_000,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
    globalSetup: GLOBAL_SETUP,
    use: {
      baseURL,
      trace: 'retain-on-failure',
      screenshot: 'only-on-failure',
    },
    projects: resolveBrowsers(process.env, options.browsers).map((name) => ({
      name,
      use: { ...DEVICES[name] },
    })),
  })
}

export interface VisualConfigOptions {
  /** Directory containing the visual specs, relative to the config file. */
  testDir: string
  /** Defaults to WP_BASE_URL, then the wp-env URL. */
  baseURL?: string
  /** Fraction of pixels allowed to differ (0 to 1). Default 0.01. */
  maxDiffPixelRatio?: number
}

/**
 * Opt-in visual compare: Chromium only, `toHaveScreenshot`, baselines under
 * `<testDir>/__screenshots__/`. Baselines are recorded on the CI runner (see
 * `.github/workflows/visual.yml`) so fonts and rendering match.
 */
export function createVisualConfig(options: VisualConfigOptions): PlaywrightTestConfig {
  const ratio = options.maxDiffPixelRatio ?? 0.01
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
    throw new Error(`createVisualConfig: maxDiffPixelRatio must be between 0 and 1 (got ${ratio})`)
  }

  return defineConfig({
    testDir: options.testDir,
    timeout: 60_000,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
    globalSetup: GLOBAL_SETUP,
    snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}{ext}',
    expect: {
      toHaveScreenshot: { maxDiffPixelRatio: ratio, animations: 'disabled' },
    },
    use: { baseURL: resolveBaseURL(options.baseURL) },
    projects: [{ name: 'chromium', use: { ...DEVICES.chromium } }],
  })
}
