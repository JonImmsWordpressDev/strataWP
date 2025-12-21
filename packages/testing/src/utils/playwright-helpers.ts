/**
 * Playwright E2E Testing Helpers
 * Helper functions for WordPress E2E testing with Playwright
 */

import type { Page, Locator } from '@playwright/test'

/**
 * WordPress login helper
 */
export async function wpLogin(
  page: Page,
  username: string = 'admin',
  password: string = 'password'
) {
  await page.goto('/wp-login.php')
  await page.fill('#user_login', username)
  await page.fill('#user_pass', password)
  await page.click('#wp-submit')
  await page.waitForLoadState('networkidle')
}

/**
 * WordPress logout helper
 */
export async function wpLogout(page: Page) {
  await page.goto('/wp-login.php?action=logout')
  await page.click('a') // Confirm logout
  await page.waitForLoadState('networkidle')
}

/**
 * Navigate to block editor
 */
export async function openBlockEditor(page: Page, postType: string = 'post') {
  await page.goto(`/wp-admin/post-new.php?post_type=${postType}`)
  await page.waitForSelector('.block-editor')
}

/**
 * Insert a block in the editor
 */
export async function insertBlock(page: Page, blockName: string) {
  // Click the block inserter
  await page.click('.block-editor-inserter__toggle')

  // Search for the block
  await page.fill('.block-editor-inserter__search input', blockName)

  // Click the block
  await page.click(`button[aria-label*="${blockName}"]`)

  // Wait for block to be inserted
  await page.waitForSelector(`[data-type*="${blockName}"]`)
}

/**
 * Get block by type
 */
export function getBlock(page: Page, blockType: string): Locator {
  return page.locator(`[data-type="${blockType}"]`)
}

/**
 * Get selected block
 */
export function getSelectedBlock(page: Page): Locator {
  return page.locator('.is-selected')
}

/**
 * Type in block
 */
export async function typeInBlock(page: Page, blockType: string, text: string) {
  const block = getBlock(page, blockType)
  await block.click()
  await block.type(text)
}

/**
 * Update block attribute via inspector
 */
export async function updateBlockAttribute(
  page: Page,
  attributeName: string,
  value: string | number | boolean
) {
  // Open inspector if not open
  const inspectorButton = page.locator('button[aria-label="Settings"]')
  if (await inspectorButton.isVisible()) {
    await inspectorButton.click()
  }

  // Find and update the control
  const control = page.locator(`[aria-label*="${attributeName}"]`)
  await control.fill(String(value))
}

/**
 * Publish post
 */
export async function publishPost(page: Page) {
  const publishButton = page.locator('.editor-post-publish-button__button')

  // Click publish panel button
  await publishButton.first().click()

  // Click final publish button
  await publishButton.last().click()

  // Wait for success notice
  await page.waitForSelector('.components-snackbar')
}

/**
 * Save draft
 */
export async function saveDraft(page: Page) {
  await page.click('.editor-post-save-draft')
  await page.waitForSelector('.is-saved')
}

/**
 * Preview post
 */
export async function previewPost(page: Page): Promise<Page> {
  const [previewPage] = await Promise.all([
    page.context().waitForEvent('page'),
    page.click('.editor-post-preview'),
  ])

  await previewPage.waitForLoadState('networkidle')
  return previewPage
}

/**
 * Check if block exists
 */
export async function blockExists(page: Page, blockType: string): Promise<boolean> {
  return (await getBlock(page, blockType).count()) > 0
}

/**
 * Get block count
 */
export async function getBlockCount(page: Page, blockType?: string): Promise<number> {
  if (blockType) {
    return await getBlock(page, blockType).count()
  }
  return await page.locator('[data-type]').count()
}

/**
 * Select block
 */
export async function selectBlock(page: Page, blockType: string) {
  await getBlock(page, blockType).click()
}

/**
 * Delete block
 */
export async function deleteBlock(page: Page, blockType: string) {
  await selectBlock(page, blockType)
  await page.keyboard.press('Backspace')
}

/**
 * Move block up
 */
export async function moveBlockUp(page: Page, blockType: string) {
  await selectBlock(page, blockType)
  await page.click('button[aria-label="Move up"]')
}

/**
 * Move block down
 */
export async function moveBlockDown(page: Page, blockType: string) {
  await selectBlock(page, blockType)
  await page.click('button[aria-label="Move down"]')
}

/**
 * Wait for WordPress admin
 */
export async function waitForWPAdmin(page: Page) {
  await page.waitForSelector('#wpadminbar')
}

/**
 * Navigate to WordPress admin page
 */
export async function goToWPAdmin(page: Page, path: string = '') {
  await page.goto(`/wp-admin/${path}`)
  await waitForWPAdmin(page)
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  await page.goto('/wp-admin/')
  return page.url().includes('/wp-admin/')
}

/**
 * Take accessible screenshot
 */
export async function takeA11yScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `screenshots/${name}.png`,
    fullPage: true,
  })
}

/**
 * Check for console errors
 */
export function setupConsoleErrorTracking(page: Page): string[] {
  const errors: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  page.on('pageerror', (error) => {
    errors.push(error.message)
  })

  return errors
}
