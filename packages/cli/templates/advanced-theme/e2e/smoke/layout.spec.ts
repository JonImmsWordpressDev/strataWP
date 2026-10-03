import { test, expect } from '@playwright/test'

test('layout renders header, content and footer', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.locator('main').first()).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  // Patterns that fail to resolve render nothing, silently.
  const text = (await page.locator('main').first().innerText()).trim()
  expect(text.length).toBeGreaterThan(0)
})
