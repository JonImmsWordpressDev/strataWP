import { describe, it, expect } from 'vitest'
import {
  toHaveBlockClass,
  toHaveBlockAttributes,
  toBeValidBlockMarkup,
  toBeValidWordPressBlock,
} from '../index'

describe('toBeValidBlockMarkup', () => {
  it('passes for valid wp block comment markup', () => {
    const r = toBeValidBlockMarkup(
      '<!-- wp:paragraph --><p>hi</p><!-- /wp:paragraph -->'
    )
    expect(r.pass).toBe(true)
  })

  it('fails when block comments are missing', () => {
    expect(toBeValidBlockMarkup('<p>hi</p>').pass).toBe(false)
  })
})

describe('toHaveBlockClass', () => {
  it('passes when element has the wp-block-<name> class', () => {
    const el = document.createElement('div')
    el.className = 'wp-block-my-hero'
    expect(toHaveBlockClass(el, 'my/hero').pass).toBe(true)
  })

  it('fails when the class is absent', () => {
    const el = document.createElement('div')
    expect(toHaveBlockClass(el, 'my/hero').pass).toBe(false)
  })
})

describe('toHaveBlockAttributes', () => {
  it('passes when all required attributes are present', () => {
    const block = { attributes: { title: {}, color: {} } }
    expect(toHaveBlockAttributes(block, ['title']).pass).toBe(true)
  })

  it('fails when a required attribute is missing', () => {
    const block = { attributes: { title: {} } }
    expect(toHaveBlockAttributes(block, ['missing']).pass).toBe(false)
  })
})

describe('toBeValidWordPressBlock', () => {
  it('passes for an element with data-type and a wp-block class', () => {
    const el = document.createElement('div')
    el.setAttribute('data-type', 'core/paragraph')
    el.className = 'wp-block-paragraph'
    expect(toBeValidWordPressBlock(el).pass).toBe(true)
  })

  it('fails when data-type is missing', () => {
    const el = document.createElement('div')
    el.className = 'wp-block-paragraph'
    expect(toBeValidWordPressBlock(el).pass).toBe(false)
  })
})
