import { test, expect } from '@playwright/test'

test('primary navigation links are visible and Home navigates to the front page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/this-page-does-not-exist-404/', { waitUntil: 'domcontentloaded' })
  const nav = page.getByRole('navigation').first()
  const home = nav.getByRole('link', { name: 'Home' })
  await expect(home).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Sample Page' })).toBeVisible()
  await home.click()
  await page.waitForURL((url) => url.pathname === '/')
  expect(new URL(page.url()).pathname).toBe('/')
})

test('mobile menu opens and closes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const open = page.getByRole('button', { name: 'Open menu' })
  await expect(open).toBeVisible()
  await open.click()
  const overlay = page.locator('.wp-block-navigation__responsive-container.is-menu-open')
  await expect(overlay).toBeVisible()
  await expect(overlay.getByRole('link', { name: 'Home' })).toBeVisible()
  await page.getByRole('button', { name: 'Close menu' }).click()
  // The container stays in the DOM when closed; only the open-state class goes.
  await expect(overlay).toHaveCount(0)
  await expect(open).toBeVisible()
})
