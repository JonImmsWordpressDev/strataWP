/**
 * Vitest Testing Utilities
 * Re-export everything needed for Vitest tests
 */

export * from './utils/block-testing'
export * from './mocks/wordpress'
export * from './matchers/index'

// Re-export testing library utilities
export * from '@testing-library/react'
export * from '@testing-library/user-event'
export { expect, describe, it, test, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
