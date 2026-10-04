import { test, expect } from '@playwright/test'

const routes = [
  { name: 'home', path: '/' },
  { name: '404', path: '/this-page-does-not-exist-404/' },
]

for (const route of routes) {
  test(`layout renders header, content and footer: ${route.name}`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.locator('main').first()).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()
    // Patterns that fail to resolve render nothing, silently.
    const text = (await page.locator('main').first().innerText()).trim()
    expect(text.length).toBeGreaterThan(0)
  })
}

// The front-page hero pattern uses an h2; the page's single h1 is the site
// title; core/site-title defaults to level 1 (the header pattern sets no
// level), so it renders as an h1 on every page, not only the front page.
test('home has exactly one h1', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const heading = page.locator('h1')
  await expect(heading).toHaveCount(1)
  await expect(heading).toBeVisible()
})

test('home renders the home pattern content', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  // The home pattern uses this heading text twice (hero and features section),
  // so take the first match instead of tripping Playwright's strict mode.
  await expect(
    page
      .getByRole('heading', { level: 2, name: 'Experience the next generation of WordPress.' })
      .first()
  ).toBeVisible()
})
