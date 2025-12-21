# @stratawp/testing

Comprehensive testing utilities for StrataWP WordPress themes. Includes unit testing with Vitest, E2E testing with Playwright, WordPress mocks, and custom matchers.

## Features

- **Unit Testing**: Vitest with WordPress mocks and utilities
- **E2E Testing**: Playwright for full user workflows
- **WordPress Mocks**: Complete mocks for WordPress JavaScript APIs
- **Custom Matchers**: WordPress-specific test assertions
- **Coverage Reporting**: Built-in code coverage with thresholds
- **Testing Utilities**: Block testing helpers and utilities
- **CI/CD Ready**: Pre-configured for GitHub Actions

## Installation

```bash
pnpm add -D @stratawp/testing
```

## Quick Start

### Unit Testing with Vitest

Create a test file (`__tests__/my-block.test.tsx`):

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import {
  renderBlockEdit,
  testBlockRegistration,
  setupWordPressMocks,
  setupCustomMatchers,
} from '@stratawp/testing/vitest'

beforeAll(() => {
  setupWordPressMocks()
  setupCustomMatchers()
})

describe('My Block', () => {
  it('should register correctly', () => {
    testBlockRegistration('my-theme/my-block', {
      title: 'My Block',
      category: 'common',
    })
  })

  it('should render edit component', () => {
    const EditComponent = ({ attributes }: any) => (
      <div className="wp-block-my-theme-my-block">
        {attributes.content}
      </div>
    )

    const { getByText } = renderBlockEdit(EditComponent, {
      attributes: { content: 'Hello World' },
    })

    expect(getByText('Hello World')).toBeInTheDocument()
  })
})
```

Run tests:
```bash
pnpm test
```

### E2E Testing with Playwright

Create an E2E test (`e2e/my-block.spec.ts`):

```typescript
import {
  test,
  expect,
  wpLogin,
  openBlockEditor,
  insertBlock,
  publishPost,
} from '@stratawp/testing/playwright'

test.describe('My Block E2E', () => {
  test.beforeEach(async ({ page }) => {
    await wpLogin(page)
  })

  test('should insert and publish block', async ({ page }) => {
    await openBlockEditor(page, 'post')
    await insertBlock(page, 'My Block')

    // Interact with your block
    await page.fill('[data-type="my-theme/my-block"] input', 'Test content')

    await publishPost(page)

    await expect(page.locator('.components-snackbar'))
      .toContainText('published')
  })
})
```

Run E2E tests:
```bash
pnpm test:e2e
```

## Unit Testing

### WordPress Mocks

The package includes comprehensive mocks for WordPress JavaScript APIs:

```typescript
import { setupWordPressMocks } from '@stratawp/testing/vitest'

beforeAll(() => {
  setupWordPressMocks()
})
```

**Mocked APIs:**
- `@wordpress/blocks` - Block registration and manipulation
- `@wordpress/data` - Data stores and state management
- `@wordpress/i18n` - Internationalization functions
- `@wordpress/components` - UI components
- `@wordpress/block-editor` - Block editor components
- `@wordpress/element` - React utilities
- `@wordpress/api-fetch` - REST API requests

### Block Testing Utilities

#### renderBlockEdit()

Render a block's edit component:

```typescript
import { renderBlockEdit } from '@stratawp/testing/vitest'

const { getByText, getByRole } = renderBlockEdit(EditComponent, {
  attributes: { content: 'Test' },
  setAttributes: vi.fn(),
})
```

#### renderBlockSave()

Render a block's save component:

```typescript
import { renderBlockSave } from '@stratawp/testing/vitest'

const { container } = renderBlockSave(SaveComponent, {
  attributes: { content: 'Test' },
})
```

#### testBlockRegistration()

Test if a block is registered correctly:

```typescript
import { testBlockRegistration } from '@stratawp/testing/vitest'

testBlockRegistration('my-theme/my-block', {
  title: 'My Block',
  category: 'design',
  attributes: {
    content: { type: 'string', default: '' },
  },
})
```

#### createMockAttributes()

Create mock block attributes:

```typescript
import { createMockAttributes } from '@stratawp/testing/vitest'

const attributes = createMockAttributes('core/paragraph', {
  content: 'Custom content',
})
```

### Custom Matchers

WordPress-specific test assertions:

```typescript
import { setupCustomMatchers } from '@stratawp/testing/vitest'

beforeAll(() => {
  setupCustomMatchers()
})

// Check if element has block class
expect(element).toHaveBlockClass('my-theme/my-block')

// Check if block is registered
expect('my-theme/my-block').toBeRegisteredBlock()

// Check if block has attributes
expect(blockType).toHaveBlockAttributes(['content', 'align'])

// Check if element is valid WordPress block
expect(element).toBeValidWordPressBlock()

// Check if string is valid block markup
expect(markup).toBeValidBlockMarkup()
```

## E2E Testing

### WordPress Helpers

#### wpLogin()

Login to WordPress:

```typescript
import { wpLogin } from '@stratawp/testing/playwright'

await wpLogin(page, 'admin', 'password')
```

#### openBlockEditor()

Open the block editor:

```typescript
import { openBlockEditor } from '@stratawp/testing/playwright'

await openBlockEditor(page, 'post') // or 'page', 'custom-post-type'
```

#### insertBlock()

Insert a block:

```typescript
import { insertBlock } from '@stratawp/testing/playwright'

await insertBlock(page, 'Paragraph')
await insertBlock(page, 'My Custom Block')
```

#### publishPost()

Publish the current post:

```typescript
import { publishPost } from '@stratawp/testing/playwright'

await publishPost(page)
```

#### previewPost()

Preview the post in a new tab:

```typescript
import { previewPost } from '@stratawp/testing/playwright'

const previewPage = await previewPost(page)
await expect(previewPage.locator('h1')).toContainText('My Heading')
await previewPage.close()
```

### Block Interaction

#### selectBlock()

Select a specific block:

```typescript
import { selectBlock } from '@stratawp/testing/playwright'

await selectBlock(page, 'core/paragraph')
```

#### deleteBlock()

Delete a block:

```typescript
import { deleteBlock } from '@stratawp/testing/playwright'

await deleteBlock(page, 'core/paragraph')
```

#### moveBlockUp() / moveBlockDown()

Move blocks:

```typescript
import { moveBlockUp, moveBlockDown } from '@stratawp/testing/playwright'

await moveBlockUp(page, 'core/paragraph')
await moveBlockDown(page, 'core/heading')
```

#### updateBlockAttribute()

Update a block attribute via inspector:

```typescript
import { updateBlockAttribute } from '@stratawp/testing/playwright'

await updateBlockAttribute(page, 'Alignment', 'center')
```

### Utilities

#### setupConsoleErrorTracking()

Track console errors during tests:

```typescript
import { setupConsoleErrorTracking } from '@stratawp/testing/playwright'

test('should not have console errors', async ({ page }) => {
  const errors = setupConsoleErrorTracking(page)

  // Run your test...

  expect(errors.length).toBe(0)
})
```

## Configuration

### Vitest Configuration

Create `vitest.config.ts` in your theme:

```typescript
import { defineConfig } from 'vitest/config'
import { vitestConfig } from '@stratawp/testing/vitest'

export default defineConfig({
  ...vitestConfig,
  test: {
    ...vitestConfig.test,
    // Your custom test configuration
  },
})
```

### Playwright Configuration

Create `playwright.config.ts` in your theme:

```typescript
import { defineConfig } from '@playwright/test'
import { playwrightConfig } from '@stratawp/testing/playwright'

export default defineConfig({
  ...playwrightConfig,
  use: {
    ...playwrightConfig.use,
    baseURL: 'http://localhost:8888', // Your WordPress URL
  },
})
```

## Code Coverage

Run tests with coverage:

```bash
pnpm test:coverage
```

**Coverage Thresholds:**
- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

View coverage report:
```bash
open coverage/index.html
```

## Best Practices

### Unit Tests

1. **Mock WordPress APIs**
   ```typescript
   beforeAll(() => {
     setupWordPressMocks()
     setupCustomMatchers()
   })
   ```

2. **Test Block Registration**
   ```typescript
   it('should register with correct configuration', () => {
     testBlockRegistration('my-theme/my-block', expectedConfig)
   })
   ```

3. **Test Component Rendering**
   ```typescript
   it('should render with attributes', () => {
     const { getByText } = renderBlockEdit(EditComponent, {
       attributes: { content: 'Test' },
     })
     expect(getByText('Test')).toBeInTheDocument()
   })
   ```

4. **Test Attribute Updates**
   ```typescript
   it('should update attributes', () => {
     const setAttributes = vi.fn()
     const { getByRole } = renderBlockEdit(EditComponent, { setAttributes })

     userEvent.click(getByRole('button'))
     expect(setAttributes).toHaveBeenCalledWith({ clicked: true })
   })
   ```

### E2E Tests

1. **Login Before Each Test**
   ```typescript
   test.beforeEach(async ({ page }) => {
     await wpLogin(page)
   })
   ```

2. **Use Descriptive Test Names**
   ```typescript
   test('should insert heading block and change level to H3', async ({ page }) => {
     // ...
   })
   ```

3. **Wait for Network Idle**
   ```typescript
   await page.waitForLoadState('networkidle')
   ```

4. **Take Screenshots on Failure**
   ```typescript
   test('visual test', async ({ page }) => {
     await page.screenshot({ path: 'screenshots/my-block.png' })
   })
   ```

5. **Test User Workflows**
   ```typescript
   test('complete blog post creation workflow', async ({ page }) => {
     await openBlockEditor(page, 'post')
     await insertBlock(page, 'Heading')
     await page.keyboard.type('My Post Title')
     await insertBlock(page, 'Paragraph')
     await page.keyboard.type('Post content...')
     await publishPost(page)
     // Verify post is published
   })
   ```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test:coverage

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Examples

See the `examples/basic-theme/__tests__` and `examples/basic-theme/e2e` directories for complete examples.

## Troubleshooting

### WordPress API Not Mocked

**Problem:** Tests fail with "wp is not defined"

**Solution:** Call `setupWordPressMocks()` before your tests:
```typescript
beforeAll(() => {
  setupWordPressMocks()
})
```

### Custom Matchers Not Working

**Problem:** Custom matchers like `toHaveBlockClass` are not recognized

**Solution:** Call `setupCustomMatchers()`:
```typescript
beforeAll(() => {
  setupCustomMatchers()
})
```

### Playwright Tests Timeout

**Problem:** E2E tests timeout

**Solution:** Increase timeout in `playwright.config.ts`:
```typescript
export default defineConfig({
  timeout: 60 * 1000, // 60 seconds
})
```

### Block Editor Not Loading

**Problem:** Block editor doesn't load in E2E tests

**Solution:** Ensure WordPress is running and the URL is correct:
```typescript
use: {
  baseURL: process.env.WP_BASE_URL || 'http://localhost:8888',
}
```

## Contributing

Contributions are welcome! Please see the [main StrataWP repository](https://github.com/JonImmsWordpressDev/StrataWP) for contribution guidelines.

## License

GPL-3.0-or-later

## Support

- **Issues**: https://github.com/JonImmsWordpressDev/StrataWP/issues
- **Discussions**: https://github.com/JonImmsWordpressDev/StrataWP/discussions
- **Documentation**: https://github.com/JonImmsWordpressDev/StrataWP#readme

---

**Test with Confidence!** Write comprehensive tests for your WordPress themes with StrataWP testing utilities.
