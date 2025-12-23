/**
 * Example E2E Test
 * Demonstrates how to test WordPress block editor with Playwright
 */

import {
  test,
  expect,
  wpLogin,
  openBlockEditor,
  insertBlock,
  publishPost,
  previewPost,
  blockExists,
} from '@stratawp/testing/playwright'

test.describe('Block Editor E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login to WordPress
    await wpLogin(page)
  })

  test('should insert and publish a paragraph block', async ({ page }) => {
    // Open block editor
    await openBlockEditor(page, 'post')

    // Insert paragraph block
    await insertBlock(page, 'Paragraph')

    // Verify block was inserted
    const exists = await blockExists(page, 'core/paragraph')
    expect(exists).toBe(true)

    // Type in block
    await page.keyboard.type('This is a test paragraph')

    // Publish post
    await publishPost(page)

    // Verify success message
    await expect(page.locator('.components-snackbar')).toContainText('published')
  })

  test('should preview post with blocks', async ({ page, context }) => {
    // Open block editor
    await openBlockEditor(page, 'post')

    // Insert heading
    await insertBlock(page, 'Heading')
    await page.keyboard.type('Test Heading')

    // Insert paragraph
    await insertBlock(page, 'Paragraph')
    await page.keyboard.type('Test paragraph content')

    // Preview post
    const previewPage = await previewPost(page)

    // Verify content in preview
    await expect(previewPage.locator('h2')).toContainText('Test Heading')
    await expect(previewPage.locator('p')).toContainText('Test paragraph content')

    await previewPage.close()
  })

  test('should update block attributes', async ({ page }) => {
    // Open block editor
    await openBlockEditor(page, 'post')

    // Insert heading
    await insertBlock(page, 'Heading')

    // Change heading level
    await page.click('button[aria-label="Change level"]')
    await page.click('button[aria-label="Heading 3"]')

    // Verify heading level changed
    const heading = page.locator('[data-type="core/heading"] h3')
    await expect(heading).toBeVisible()
  })

  test('should move blocks up and down', async ({ page }) => {
    // Open block editor
    await openBlockEditor(page, 'post')

    // Insert first paragraph
    await insertBlock(page, 'Paragraph')
    await page.keyboard.type('First paragraph')

    // Insert second paragraph
    await insertBlock(page, 'Paragraph')
    await page.keyboard.type('Second paragraph')

    // Move first block down
    await page.click('[data-type="core/paragraph"]:first-child')
    await page.click('button[aria-label="Move down"]')

    // Verify order changed
    const paragraphs = await page.locator('[data-type="core/paragraph"] p').allTextContents()
    expect(paragraphs[0]).toContain('Second paragraph')
    expect(paragraphs[1]).toContain('First paragraph')
  })

  test('should handle console errors gracefully', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await openBlockEditor(page, 'post')
    await insertBlock(page, 'Paragraph')

    // No critical errors should occur
    const criticalErrors = errors.filter(
      (err) => !err.includes('Warning') && !err.includes('DevTools')
    )

    expect(criticalErrors.length).toBe(0)
  })
})
