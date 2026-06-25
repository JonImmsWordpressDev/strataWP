import { test, expect } from '@playwright/test'
import { makeAxeBuilder } from '@stratawp/testing/playwright'

const routes = [
  { name: 'home', path: '/' },
  { name: 'single post', path: '/?p=1' },
  { name: 'page', path: '/?page_id=2' },
  { name: 'search', path: '/?s=accessibility' },
  { name: '404', path: '/this-page-does-not-exist-404/' },
]

for (const route of routes) {
  test(`a11y: ${route.name}`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('main').first()).toBeVisible()
    const results = await makeAxeBuilder(page).analyze()
    expect(results.violations).toEqual([])
  })
}
