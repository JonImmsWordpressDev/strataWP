/**
 * Playwright E2E Testing Utilities
 * Re-export everything needed for Playwright tests
 */

export * from './utils/playwright-helpers'

// Re-export Playwright test utilities
export { test, expect } from '@playwright/test'
export type { Page, Locator, Browser, BrowserContext } from '@playwright/test'

// Re-export axe a11y utilities
export { makeAxeBuilder, WCAG_AA_TAGS } from './axe'
