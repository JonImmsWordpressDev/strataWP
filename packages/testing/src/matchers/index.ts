/**
 * Custom Vitest Matchers
 * WordPress-specific test matchers
 */

import { expect } from 'vitest'

/**
 * Check if element has WordPress block class
 */
export function toHaveBlockClass(received: HTMLElement, blockName: string) {
  const className = `wp-block-${blockName.replace('/', '-')}`
  const pass = received.classList.contains(className)

  return {
    pass,
    message: () =>
      pass
        ? `Expected element not to have block class ${className}`
        : `Expected element to have block class ${className}`,
  }
}

/**
 * Check if block is registered
 */
export function toBeRegisteredBlock(received: string) {
  const { getBlockType } = (global as any).wp?.blocks || {}

  if (!getBlockType) {
    return {
      pass: false,
      message: () => 'WordPress blocks API is not available',
    }
  }

  const blockType = getBlockType(received)
  const pass = blockType !== undefined

  return {
    pass,
    message: () =>
      pass
        ? `Expected block ${received} not to be registered`
        : `Expected block ${received} to be registered`,
  }
}

/**
 * Check if block has required attributes
 */
export function toHaveBlockAttributes(
  received: any,
  expectedAttributes: string[]
) {
  if (!received || !received.attributes) {
    return {
      pass: false,
      message: () => 'Block does not have attributes property',
    }
  }

  const actualAttributes = Object.keys(received.attributes)
  const missingAttributes = expectedAttributes.filter(
    (attr) => !actualAttributes.includes(attr)
  )

  const pass = missingAttributes.length === 0

  return {
    pass,
    message: () =>
      pass
        ? `Expected block not to have attributes: ${expectedAttributes.join(', ')}`
        : `Expected block to have attributes: ${missingAttributes.join(', ')}`,
  }
}

/**
 * Check if element is a valid WordPress block
 */
export function toBeValidWordPressBlock(received: HTMLElement) {
  const hasDataType = received.hasAttribute('data-type')
  const hasWpBlock = received.classList.contains('wp-block') ||
                     Array.from(received.classList).some(c => c.startsWith('wp-block-'))

  const pass = hasDataType && hasWpBlock

  return {
    pass,
    message: () =>
      pass
        ? 'Expected element not to be a valid WordPress block'
        : 'Expected element to be a valid WordPress block (must have data-type attribute and wp-block class)',
  }
}

/**
 * Check if string is valid block markup
 */
export function toBeValidBlockMarkup(received: string) {
  // Check for WordPress block comment syntax
  const hasStartComment = received.includes('<!-- wp:')
  const hasEndComment = received.includes('<!-- /wp:') || received.includes('/-->')

  const pass = hasStartComment && hasEndComment

  return {
    pass,
    message: () =>
      pass
        ? 'Expected string not to be valid block markup'
        : 'Expected string to be valid block markup (must include WordPress block comments)',
  }
}

/**
 * Extend Vitest matchers
 */
export function setupCustomMatchers() {
  expect.extend({
    toHaveBlockClass,
    toBeRegisteredBlock,
    toHaveBlockAttributes,
    toBeValidWordPressBlock,
    toBeValidBlockMarkup,
  })
}

// Type declarations for TypeScript
declare global {
  namespace Vi {
    interface Matchers<R = any> {
      toHaveBlockClass(blockName: string): R
      toBeRegisteredBlock(): R
      toHaveBlockAttributes(attributes: string[]): R
      toBeValidWordPressBlock(): R
      toBeValidBlockMarkup(): R
    }
  }
}
