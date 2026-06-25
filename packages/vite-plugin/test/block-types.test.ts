/**
 * Unit tests for the block.json -> TypeScript attribute-type codegen.
 *
 * `generateBlockAttributeTypes(blockJson)` turns a parsed block.json into a
 * deterministic `block-attributes.ts` file that the block's `edit.tsx`
 * consumes. The committed output is diffed by the drift gate
 * (`scripts/check-types-drift.mjs`), so the content must be stable and match
 * the repo style (no semicolons, single quotes, 2-space indent).
 *
 * JSON -> TS type map:
 *   string            -> string
 *   number | integer  -> number
 *   boolean           -> boolean
 *   array             -> unknown[]
 *   object            -> Record<string, unknown>
 *   (missing/unknown) -> unknown
 *
 * Optionality: an attribute with a `default` is REQUIRED (no `?`); an attribute
 * without a `default` is optional (`?`).
 */

import { describe, it, expect } from 'vitest'
import { generateBlockAttributeTypes } from '../src/plugins/block-types'

describe('generateBlockAttributeTypes', () => {
  it('maps every JSON attribute type to its TS equivalent and sorts keys', () => {
    const blockJson = {
      name: 'strata-basic/hero',
      attributes: {
        title: { type: 'string' },
        count: { type: 'number' },
        items: { type: 'array' },
        enabled: { type: 'boolean' },
        meta: { type: 'object' },
      },
    }

    const result = generateBlockAttributeTypes(blockJson)

    expect(result.fileName).toBe('block-attributes.ts')

    // AUTO-GENERATED banner with a do-not-edit warning.
    expect(result.content).toMatch(/AUTO-GENERATED/)
    expect(result.content).toMatch(/do not edit/i)

    // Interface name = PascalCase(block slug) + 'Attributes'; keys sorted.
    expect(result.content).toContain('export interface HeroAttributes {')
    expect(result.content).toContain(
      [
        'export interface HeroAttributes {',
        '  count?: number',
        '  enabled?: boolean',
        '  items?: unknown[]',
        '  meta?: Record<string, unknown>',
        '  title?: string',
        '}',
      ].join('\n')
    )
  })

  it('treats integer as number and unknown/missing types as unknown', () => {
    const blockJson = {
      name: 'strata-basic/widget',
      attributes: {
        amount: { type: 'integer' },
        mystery: { type: 'weird-type' },
        bare: {},
      },
    }

    const { content } = generateBlockAttributeTypes(blockJson)

    expect(content).toContain('export interface WidgetAttributes {')
    expect(content).toContain('  amount?: number')
    expect(content).toContain('  bare?: unknown')
    expect(content).toContain('  mystery?: unknown')
  })

  it('makes attributes WITH a default required (no `?`) and those without optional', () => {
    const blockJson = {
      name: 'strata-basic/hero',
      attributes: {
        title: { type: 'string', default: 'Welcome' },
        overlayOpacity: { type: 'number', default: 0.5 },
        backgroundImage: { type: 'string' },
      },
    }

    const { content } = generateBlockAttributeTypes(blockJson)

    // Has a default -> required (no question mark).
    expect(content).toContain('  title: string')
    expect(content).toContain('  overlayOpacity: number')
    // No default -> optional.
    expect(content).toContain('  backgroundImage?: string')
  })

  it('handles a block with no attributes by emitting an empty interface', () => {
    const blockJson = { name: 'strata-basic/spacer' }

    const { content } = generateBlockAttributeTypes(blockJson)

    expect(content).toContain('export interface SpacerAttributes {}')
  })

  it('emits stable output (no semicolons, trailing newline)', () => {
    const blockJson = {
      name: 'strata-basic/hero',
      attributes: { title: { type: 'string' } },
    }

    const { content } = generateBlockAttributeTypes(blockJson)

    // No semicolons in the interface body.
    expect(content).not.toMatch(/;\s*$/m)
    // File always ends with a single trailing newline.
    expect(content.endsWith('\n')).toBe(true)
  })
})
