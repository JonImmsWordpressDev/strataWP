import { describe, it, expect } from 'vitest'
import { generateBlock } from './block'

describe('generateBlock', () => {
  it('always emits block.json, edit.tsx, and style.css', () => {
    const result = generateBlock({
      name: 'Hero',
      namespace: 'my-theme',
      type: 'static',
      category: 'common',
      styleFramework: 'none',
    })
    const paths = result.files.map((f) => f.path)
    expect(paths).toContain('src/blocks/hero/block.json')
    expect(paths).toContain('src/blocks/hero/edit.tsx')
    expect(paths).toContain('src/blocks/hero/style.css')
  })

  it('emits render.php only when type is dynamic', () => {
    const dynamic = generateBlock({
      name: 'Hero',
      namespace: 'my-theme',
      type: 'dynamic',
      category: 'common',
      styleFramework: 'none',
    })
    const paths = dynamic.files.map((f) => f.path)
    expect(paths).toContain('src/blocks/hero/render.php')

    const staticResult = generateBlock({
      name: 'Hero',
      namespace: 'my-theme',
      type: 'static',
      category: 'common',
      styleFramework: 'none',
    })
    const staticPaths = staticResult.files.map((f) => f.path)
    expect(staticPaths).not.toContain('src/blocks/hero/render.php')
  })

  it('block.json uses apiVersion 3', () => {
    const result = generateBlock({
      name: 'Testimonial',
      namespace: 'demo',
      type: 'static',
      category: 'text',
      styleFramework: 'none',
    })
    const blockJson = result.files.find((f) => f.path.endsWith('block.json'))!
    const parsed = JSON.parse(blockJson.content)
    expect(parsed.apiVersion).toBe(3)
  })

  it('block.json name is ${namespace}/${slug}', () => {
    const result = generateBlock({
      name: 'Call To Action',
      namespace: 'my-theme',
      type: 'static',
      category: 'common',
      styleFramework: 'none',
    })
    const blockJson = result.files.find((f) => f.path.endsWith('block.json'))!
    const parsed = JSON.parse(blockJson.content)
    expect(parsed.name).toBe('my-theme/call-to-action')
  })

  it('parameterises the namespace — does NOT hardcode stratawp/', () => {
    const result = generateBlock({
      name: 'Banner',
      namespace: 'forge-basic',
      type: 'static',
      category: 'media',
      styleFramework: 'none',
    })
    const blockJson = result.files.find((f) => f.path.endsWith('block.json'))!
    expect(blockJson.content).not.toContain('"name": "stratawp/')
    expect(blockJson.content).toContain('"name": "forge-basic/banner"')
  })

  it('style.css references the namespaced class', () => {
    const result = generateBlock({
      name: 'Card',
      namespace: 'my-theme',
      type: 'static',
      category: 'common',
      styleFramework: 'none',
    })
    const css = result.files.find((f) => f.path.endsWith('style.css'))!
    // Should use wp-block-{namespace}-{slug} convention
    expect(css.content).toContain('wp-block-my-theme-card')
  })

  it('returns messages for the CLI layer', () => {
    const result = generateBlock({
      name: 'Hero',
      namespace: 'test',
      type: 'static',
      category: 'common',
      styleFramework: 'none',
    })
    expect(Array.isArray(result.messages)).toBe(true)
    expect(result.messages.length).toBeGreaterThan(0)
  })

  it('does not throw for valid inputs (pure)', () => {
    expect(() =>
      generateBlock({
        name: 'Safe',
        namespace: 'test',
        type: 'static',
        category: 'common',
        styleFramework: 'none',
      })
    ).not.toThrow()
  })
})
