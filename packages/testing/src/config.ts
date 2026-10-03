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

/**
 * One Playwright definition shared by the monorepo and generated themes.
 * Chromium locally for speed; Chromium + Firefox + WebKit in CI.
 */
export function createSmokeConfig(options: SmokeConfigOptions): PlaywrightTestConfig {
  const baseURL = options.baseURL ?? process.env.WP_BASE_URL ?? 'http://localhost:8888'

  return defineConfig({
    testDir: options.testDir,
    timeout: 30_000,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
    globalSetup: fileURLToPath(new URL('./global-setup.js', import.meta.url)),
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
