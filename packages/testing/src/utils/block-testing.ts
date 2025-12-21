/**
 * Block Testing Utilities
 * Helper functions for testing Gutenberg blocks
 */

import { render, RenderOptions } from '@testing-library/react'
import { createElement } from 'react'

/**
 * Block Configuration Interface
 */
export interface BlockConfiguration {
  name?: string
  title?: string
  description?: string
  category?: string
  icon?: string | Record<string, any>
  keywords?: string[]
  attributes?: Record<string, any>
  supports?: Record<string, any>
  [key: string]: any
}

/**
 * Render a block's edit component for testing
 */
export function renderBlockEdit(
  EditComponent: React.ComponentType<any>,
  props: any = {},
  options?: RenderOptions
): ReturnType<typeof render> {
  const defaultProps = {
    attributes: {},
    setAttributes: vi.fn(),
    isSelected: false,
    clientId: 'test-block-id',
    ...props,
  }

  return render(createElement(EditComponent, defaultProps), options)
}

/**
 * Render a block's save component for testing
 */
export function renderBlockSave(
  SaveComponent: React.ComponentType<any>,
  props: any = {},
  options?: RenderOptions
): ReturnType<typeof render> {
  const defaultProps = {
    attributes: {},
    ...props,
  }

  return render(createElement(SaveComponent, defaultProps), options)
}

/**
 * Test if a block is registered correctly
 */
export function testBlockRegistration(
  blockName: string,
  expectedConfig: Partial<BlockConfiguration>
) {
  const { getBlockType } = wp.blocks

  const blockType = getBlockType(blockName)

  if (!blockType) {
    throw new Error(`Block ${blockName} is not registered`)
  }

  // Check required fields
  expect(blockType.name).toBe(blockName)

  if (expectedConfig.title) {
    expect(blockType.title).toBe(expectedConfig.title)
  }

  if (expectedConfig.category) {
    expect(blockType.category).toBe(expectedConfig.category)
  }

  if (expectedConfig.attributes) {
    expect(blockType.attributes).toEqual(expectedConfig.attributes)
  }

  return blockType
}

/**
 * Create mock block attributes
 */
export function createMockAttributes(
  blockType: string,
  overrides: Record<string, any> = {}
): Record<string, any> {
  const defaults: Record<string, Record<string, any>> = {
    'core/paragraph': {
      content: 'Test paragraph content',
      align: 'left',
    },
    'core/heading': {
      content: 'Test heading',
      level: 2,
    },
    'core/image': {
      url: 'https://example.com/image.jpg',
      alt: 'Test image',
      id: 123,
    },
  }

  return {
    ...(defaults[blockType] || {}),
    ...overrides,
  }
}

/**
 * Test block attribute validation
 */
export function testBlockAttributes(
  EditComponent: React.ComponentType<any>,
  attributes: Record<string, any>
) {
  const setAttributes = vi.fn()

  const { rerender } = renderBlockEdit(EditComponent, {
    attributes,
    setAttributes,
  })

  return {
    setAttributes,
    rerender: (newAttributes: Record<string, any>) => {
      return rerender(
        createElement(EditComponent, {
          attributes: newAttributes,
          setAttributes,
        })
      )
    },
  }
}

/**
 * Test block save output
 */
export function testBlockSaveOutput(
  SaveComponent: React.ComponentType<any>,
  attributes: Record<string, any>
) {
  const { container } = renderBlockSave(SaveComponent, { attributes })
  return container.innerHTML
}

/**
 * Mock block context
 */
export function createMockBlockContext(overrides: any = {}) {
  return {
    clientId: 'mock-client-id',
    isSelected: false,
    isMultiSelected: false,
    hasSelectedInnerBlock: false,
    index: 0,
    ...overrides,
  }
}

/**
 * Wait for block to render
 */
export async function waitForBlockRender(
  callback: () => void,
  options: { timeout?: number } = {}
) {
  const timeout = options.timeout || 1000
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      callback()
      return
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  throw new Error('Block failed to render within timeout')
}
