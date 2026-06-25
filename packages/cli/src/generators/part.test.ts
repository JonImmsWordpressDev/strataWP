import { describe, it, expect } from 'vitest'
import { generatePart } from './part'

describe('generatePart', () => {
  describe('html markup', () => {
    it('returns a single .html file at the correct path', () => {
      const result = generatePart({ name: 'Main Header', type: 'header', markup: 'html' })
      expect(result.files).toHaveLength(1)
      expect(result.files[0].path).toBe('parts/main-header.html')
    })

    it('content contains WordPress block markup', () => {
      const result = generatePart({ name: 'Footer', type: 'footer', markup: 'html' })
      expect(result.files[0].content).toContain('wp:group')
    })
  })

  describe('php markup', () => {
    it('returns a single .php file at the correct path', () => {
      const result = generatePart({
        name: 'Sidebar',
        type: 'sidebar',
        markup: 'php',
        themeSlug: 'my-theme',
      })
      expect(result.files).toHaveLength(1)
      expect(result.files[0].path).toBe('parts/sidebar.php')
    })

    it('content contains the themeSlug @package annotation', () => {
      const result = generatePart({
        name: 'Header',
        type: 'header',
        markup: 'php',
        themeSlug: 'forge-basic',
      })
      expect(result.files[0].content).toContain('@package forge-basic')
    })
  })

  it('returns messages for the CLI layer', () => {
    const result = generatePart({ name: 'Footer', type: 'footer', markup: 'html' })
    expect(Array.isArray(result.messages)).toBe(true)
    expect(result.messages.length).toBeGreaterThan(0)
  })

  it('does not throw for valid inputs (pure)', () => {
    expect(() => generatePart({ name: 'Safe', type: 'custom', markup: 'html' })).not.toThrow()
  })
})
