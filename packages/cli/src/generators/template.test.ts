import { describe, it, expect } from 'vitest'
import { generateTemplate } from './template'

describe('generateTemplate', () => {
  it('returns a single file at the correct path', () => {
    const result = generateTemplate({ name: 'About Us', type: 'page', themeSlug: 'my-theme' })
    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe('templates/about-us.html')
  })

  it('slug is kebab-case', () => {
    const result = generateTemplate({ name: 'Privacy Policy', type: 'page', themeSlug: 'demo' })
    expect(result.files[0].path).toBe('templates/privacy-policy.html')
  })

  it('content references the themeSlug', () => {
    const result = generateTemplate({ name: 'Home', type: 'home', themeSlug: 'forge-basic' })
    expect(result.files[0].content).toContain('forge-basic')
  })

  it('returns messages for the CLI layer', () => {
    const result = generateTemplate({ name: 'Services', type: 'page', themeSlug: 'demo' })
    expect(Array.isArray(result.messages)).toBe(true)
    expect(result.messages.length).toBeGreaterThan(0)
  })

  it('custom type produces content with template-part header reference', () => {
    const result = generateTemplate({ name: 'Custom', type: 'custom', themeSlug: 'my-theme' })
    expect(result.files[0].content).toContain('wp:template-part')
  })

  it('does not throw for valid inputs (pure)', () => {
    expect(() => generateTemplate({ name: 'Safe', type: 'page', themeSlug: 'test' })).not.toThrow()
  })
})
