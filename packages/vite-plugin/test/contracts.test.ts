/**
 * Injected-defect gate for the StrataWP block.json / theme.json validator.
 *
 * Proves the gate:
 *   - PASSES a well-formed block.json (good-block.json fixture)
 *   - REJECTS a block.json with apiVersion 2 and a missing "name" field (bad-block.json)
 *   - REJECTS a block.json whose name prefix does not match the expected theme slug
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

// Import the exported validation functions from the root scripts directory.
// Using a relative path from this file up to the monorepo root then into scripts/.
const scriptPath = fileURLToPath(
  new URL('../../../scripts/validate-contracts.mjs', import.meta.url)
)
const { validateBlockJson, validateThemeJson } = await import(scriptPath)

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), 'utf8'))
}

describe('validateBlockJson — injected-defect gate', () => {
  it('passes good-block.json (correct apiVersion, name, no render)', () => {
    const obj = readFixture('good-block.json')
    const { ok, errors } = validateBlockJson(obj, 'strata-basic', null)
    expect(errors).toEqual([])
    expect(ok).toBe(true)
  })

  it('rejects bad-block.json: apiVersion 2 (superset rule) + missing "name" (WP schema required)', () => {
    const obj = readFixture('bad-block.json')
    const { ok, errors } = validateBlockJson(obj, 'strata-basic', null)
    expect(ok).toBe(false)
    // Must catch the wrong apiVersion via the superset rule
    const hasApiVersionError = errors.some(
      (e: string) => e.includes('apiVersion') && (e.includes('must be 3') || e.includes('const'))
    )
    expect(hasApiVersionError).toBe(true)
    // Must catch the missing "name" field via the WP JSON Schema (required)
    const hasMissingName = errors.some(
      (e: string) => e.includes('name') || e.toLowerCase().includes('required')
    )
    expect(hasMissingName).toBe(true)
  })

  it('rejects a block whose name prefix does not match the expected theme slug', () => {
    const obj = {
      apiVersion: 3,
      name: 'wrong-namespace/my-block',
      title: 'My Block',
    }
    const { ok, errors } = validateBlockJson(obj, 'strata-basic', null)
    expect(ok).toBe(false)
    const hasPrefixError = errors.some(
      (e: string) => e.includes('prefix') && e.includes('wrong-namespace')
    )
    expect(hasPrefixError).toBe(true)
  })

  it('rejects a block with correct prefix but mismatched theme slug', () => {
    const obj = {
      apiVersion: 3,
      name: 'strata-store/hero',
      title: 'Hero',
    }
    // Expecting strata-basic but got strata-store
    const { ok, errors } = validateBlockJson(obj, 'strata-basic', null)
    expect(ok).toBe(false)
    const hasPrefixError = errors.some(
      (e: string) => e.includes('strata-store') && e.includes('strata-basic')
    )
    expect(hasPrefixError).toBe(true)
  })
})

describe('validateThemeJson — smoke test', () => {
  it('passes a minimal valid theme.json (version 3)', () => {
    const obj = { version: 3 }
    const { ok } = validateThemeJson(obj)
    // A bare { version: 3 } should satisfy the schema (all other fields optional)
    expect(ok).toBe(true)
  })
})
