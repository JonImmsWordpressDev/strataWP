/**
 * WordPress API Mocks
 * Mock implementations of WordPress JavaScript APIs for testing
 */

import { vi } from 'vitest'

/**
 * Mock @wordpress/blocks
 */
export const mockWordPressBlocks = {
  registerBlockType: vi.fn((name: string, settings: any) => {
    return { name, ...settings }
  }),
  unregisterBlockType: vi.fn(),
  getBlockType: vi.fn((name: string) => ({
    name,
    title: 'Mock Block',
    category: 'common',
    icon: 'block-default',
    attributes: {},
  })),
  getBlockTypes: vi.fn(() => []),
  hasBlockSupport: vi.fn(() => true),
  createBlock: vi.fn((name: string, attributes?: any) => ({
    name,
    attributes: attributes || {},
    clientId: 'mock-client-id',
  })),
}

/**
 * Mock @wordpress/data
 */
export const mockWordPressData = {
  useSelect: vi.fn((callback: any) => callback(() => ({}))),
  useDispatch: vi.fn((_storeName: string) => ({})),
  select: vi.fn((_storeName: string) => ({})),
  dispatch: vi.fn((_storeName: string) => ({})),
  subscribe: vi.fn(),
  registerStore: vi.fn(),
}

/**
 * Mock @wordpress/i18n
 */
export const mockWordPressi18n = {
  __: vi.fn((text: string) => text),
  _x: vi.fn((text: string) => text),
  _n: vi.fn((single: string, plural: string, number: number) =>
    number === 1 ? single : plural
  ),
  sprintf: vi.fn((format: string, ..._args: any[]) => format),
  setLocaleData: vi.fn(),
}

/**
 * Mock @wordpress/components
 */
export const mockWordPressComponents = {
  Button: vi.fn(({ children }: any) => children),
  TextControl: vi.fn(() => null),
  SelectControl: vi.fn(() => null),
  RangeControl: vi.fn(() => null),
  ToggleControl: vi.fn(() => null),
  Panel: vi.fn(({ children }: any) => children),
  PanelBody: vi.fn(({ children }: any) => children),
  PanelRow: vi.fn(({ children }: any) => children),
}

/**
 * Mock @wordpress/block-editor
 */
export const mockWordPressBlockEditor = {
  InspectorControls: vi.fn(({ children }: any) => children),
  BlockControls: vi.fn(({ children }: any) => children),
  useBlockProps: vi.fn((props?: any) => ({
    className: 'wp-block',
    ...props,
  })),
  RichText: vi.fn(() => null),
  MediaUpload: vi.fn(() => null),
  MediaUploadCheck: vi.fn(({ children }: any) => children),
  ColorPalette: vi.fn(() => null),
  URLInput: vi.fn(() => null),
}

/**
 * Mock @wordpress/element
 */
export const mockWordPressElement = {
  createElement: vi.fn((type: any, props?: any, ...children: any[]) => ({
    type,
    props: { ...props, children },
  })),
  Fragment: vi.fn(({ children }: any) => children),
  useState: vi.fn((initialState: any) => [initialState, vi.fn()]),
  useEffect: vi.fn((_effect: () => void, _deps?: any[]) => undefined),
  useRef: vi.fn((initialValue: any) => ({ current: initialValue })),
  useMemo: vi.fn((factory: () => any, _deps?: any[]) => factory()),
  useCallback: vi.fn((callback: (...args: any[]) => any, _deps?: any[]) => callback),
}

/**
 * Mock @wordpress/api-fetch
 */
export const mockWordPressApiFetch = vi.fn(
  (_options: { path: string; method?: string; data?: any }) =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
)

/**
 * Setup all WordPress mocks
 */
export function setupWordPressMocks() {
  vi.mock('@wordpress/blocks', () => mockWordPressBlocks)
  vi.mock('@wordpress/data', () => mockWordPressData)
  vi.mock('@wordpress/i18n', () => mockWordPressi18n)
  vi.mock('@wordpress/components', () => mockWordPressComponents)
  vi.mock('@wordpress/block-editor', () => mockWordPressBlockEditor)
  vi.mock('@wordpress/element', () => mockWordPressElement)
  vi.mock('@wordpress/api-fetch', () => ({ default: mockWordPressApiFetch }))

  // Setup global WordPress objects
  ;(global as any).wp = {
    blocks: mockWordPressBlocks,
    data: mockWordPressData,
    i18n: mockWordPressi18n,
    components: mockWordPressComponents,
    blockEditor: mockWordPressBlockEditor,
    element: mockWordPressElement,
    apiFetch: mockWordPressApiFetch,
  }
}

/**
 * Clear all WordPress mocks
 */
export function clearWordPressMocks() {
  Object.values(mockWordPressBlocks).forEach((mock: any) => {
    if (typeof mock?.mockClear === 'function') {
      mock.mockClear()
    }
  })

  Object.values(mockWordPressData).forEach((mock: any) => {
    if (typeof mock?.mockClear === 'function') {
      mock.mockClear()
    }
  })

  // Clear other mocks...
}
