import { describe, it, expect } from 'vitest'
import { generateBlock } from './block'

describe('generateBlock', () => {
  it('emits block.json, edit.tsx, render.php, and style.css', () => {
    const result = generateBlock({
      name: 'Hero',
      namespace: 'my-theme',
      category: 'common',
      styleFramework: 'none',
    })
    const paths = result.files.map((f) => f.path)
    expect(paths).toContain('src/blocks/hero/block.json')
    expect(paths).toContain('src/blocks/hero/edit.tsx')
    expect(paths).toContain('src/blocks/hero/render.php')
    expect(paths).toContain('src/blocks/hero/style.css')
  })

  it('block.json declares a dynamic render callback (render.php) — every block is dynamic', () => {
    const result = generateBlock({
      name: 'Hero',
      namespace: 'my-theme',
      category: 'common',
      styleFramework: 'none',
    })
    const blockJson = result.files.find((f) => f.path.endsWith('block.json'))!
    const parsed = JSON.parse(blockJson.content)
    expect(parsed.render).toBe('file:./render.php')
  })

  it('render.php is a functional dynamic template (wrapper attributes + escaped, text-domained output)', () => {
    const result = generateBlock({
      name: 'Hero',
      namespace: 'my-theme',
      category: 'common',
      styleFramework: 'none',
    })
    const render = result.files.find((f) => f.path.endsWith('render.php'))!
    expect(render.content).toContain('<?php')
    expect(render.content).toContain('get_block_wrapper_attributes()')
    expect(render.content).toContain("esc_html__( 'Hero', 'my-theme' )")
  })

  it('block.json uses apiVersion 3', () => {
    const result = generateBlock({
      name: 'Testimonial',
      namespace: 'demo',
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
        category: 'common',
        styleFramework: 'none',
      })
    ).not.toThrow()
  })
})
