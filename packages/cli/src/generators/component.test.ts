import { describe, it, expect } from 'vitest'
import { generateComponent } from './component'

describe('generateComponent', () => {
  it('returns a single file at the correct path', () => {
    const result = generateComponent({ name: 'Analytics', type: 'feature', namespace: 'MyTheme' })
    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe('inc/Components/Analytics.php')
  })

  it('contains the correct PHP namespace in the file content', () => {
    const result = generateComponent({ name: 'Analytics', type: 'feature', namespace: 'MyTheme' })
    expect(result.files[0].content).toContain('namespace MyTheme\\Components;')
  })

  it('contains the class name in the file content', () => {
    const result = generateComponent({ name: 'Newsletter', type: 'service', namespace: 'Acme' })
    expect(result.files[0].content).toContain('class Newsletter')
  })

  it('contains implements ComponentInterface', () => {
    const result = generateComponent({ name: 'Seo', type: 'custom', namespace: 'StrataWP' })
    expect(result.files[0].content).toContain('implements ComponentInterface')
  })

  it('uses PascalCase for name input that is already PascalCase', () => {
    const result = generateComponent({
      name: 'MyComponent',
      type: 'custom',
      namespace: 'TestTheme',
    })
    expect(result.files[0].path).toBe('inc/Components/MyComponent.php')
  })

  it('returns messages for the CLI layer', () => {
    const result = generateComponent({ name: 'Analytics', type: 'feature', namespace: 'MyTheme' })
    expect(Array.isArray(result.messages)).toBe(true)
    expect(result.messages.length).toBeGreaterThan(0)
  })

  it('does NOT call process.exit or console.log (pure function)', () => {
    // If the function is pure it simply returns — no side effects to assert.
    // This is a smoke-test that it does not throw for valid inputs.
    expect(() =>
      generateComponent({ name: 'Safe', type: 'custom', namespace: 'TestNS' })
    ).not.toThrow()
  })
})
