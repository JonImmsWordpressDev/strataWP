import { test, expect } from '@playwright/test'

// Opt-in visual compare. Baselines are recorded on CI (the "Visual" workflow,
// mode "record") and committed under e2e/visual/__screenshots__/.
const routes = [
  { name: 'home', path: '/' },
  { name: '404', path: '/this-page-does-not-exist-404/' },
]
const widths = [1280, 390]

for (const route of routes) {
  for (const width of widths) {
    test(`${route.name} at ${width}px matches the baseline`, async ({ page }) => {
      await page.setViewportSize({ width, height: width >= 768 ? 800 : 844 })
      await page.goto(route.path, { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      await expect(page).toHaveScreenshot(`${route.name}-${width}.png`)
    })
  }
}
