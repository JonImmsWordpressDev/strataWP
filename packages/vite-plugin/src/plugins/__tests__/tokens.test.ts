import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { strataWPTokens, themeJsonToTokens, tokensToCss, toKebabCase } from '../tokens'
import { strataWP } from '../../index'

const themeJson = {
  version: 3,
  settings: {
    color: {
      palette: [
        { slug: 'base', name: 'Base', color: '#ffffff' },
        { slug: 'primary', name: 'Primary', color: '#0000ff' },
      ],
      gradients: [
        {
          slug: 'primary-contrast',
          name: 'Primary to Contrast',
          gradient: 'linear-gradient(0deg, var(--wp--preset--color--primary) 0%, #000 100%)',
        },
      ],
    },
    typography: {
      fontFamilies: [{ slug: 'outfit', name: 'Outfit', fontFamily: 'Outfit, sans-serif' }],
      fontSizes: [
        { slug: 'small', name: 'Small', size: '18px', fluid: false },
        { slug: 'large', name: 'Large', size: '24px', fluid: { min: '20px', max: '24px' } },
      ],
    },
    spacing: {
      spacingSizes: [{ slug: 'x-small', name: 'xSmall', size: '20px' }],
    },
    layout: { contentSize: '640px', wideSize: '1200px' },
  },
}

describe('themeJsonToTokens', () => {
  it('maps every preset group and the layout widths', () => {
    const tokens = themeJsonToTokens(themeJson)
    expect(tokens.color).toEqual([
      { slug: 'base', name: 'Base', value: '#ffffff' },
      { slug: 'primary', name: 'Primary', value: '#0000ff' },
    ])
    expect(tokens.gradient[0].slug).toBe('primary-contrast')
    expect(tokens.fontFamily).toEqual([
      { slug: 'outfit', name: 'Outfit', value: 'Outfit, sans-serif' },
    ])
    expect(tokens.fontSize).toEqual([
      { slug: 'small', name: 'Small', value: '18px', fluid: false },
      { slug: 'large', name: 'Large', value: '24px', fluid: { min: '20px', max: '24px' } },
    ])
    expect(tokens.spacing).toEqual([{ slug: 'x-small', name: 'xSmall', value: '20px' }])
    expect(tokens.layout).toEqual({ contentSize: '640px', wideSize: '1200px' })
  })

  it('returns empty groups for a theme.json without settings', () => {
    expect(themeJsonToTokens({ version: 3 })).toEqual({
      color: [],
      gradient: [],
      fontFamily: [],
      fontSize: [],
      spacing: [],
      layout: {},
    })
  })

  it('skips presets without a slug or value', () => {
    const tokens = themeJsonToTokens({
      settings: { color: { palette: [{ name: 'No slug', color: '#000' }, { slug: 'x' }] } },
    })
    expect(tokens.color).toEqual([])
  })
})

describe('tokensToCss', () => {
  it('uses WordPress preset and global style variable names', () => {
    const css = tokensToCss(themeJsonToTokens(themeJson))
    expect(css).toContain('--wp--preset--color--primary: #0000ff;')
    expect(css).toContain(
      '--wp--preset--gradient--primary-contrast: linear-gradient(0deg, var(--wp--preset--color--primary) 0%, #000 100%);'
    )
    expect(css).toContain('--wp--preset--font-family--outfit: Outfit, sans-serif;')
    expect(css).toContain('--wp--preset--font-size--large: 24px;')
    expect(css).toContain('--wp--preset--spacing--x-small: 20px;')
    expect(css).toContain('--wp--style--global--content-size: 640px;')
    expect(css).toContain('--wp--style--global--wide-size: 1200px;')
    expect(css.startsWith(':root {\n')).toBe(true)
  })

  it('kebab-cases slugs like WordPress', () => {
    expect(toKebabCase('x-small')).toBe('x-small')
    expect(toKebabCase('xSmall')).toBe('x-small')
    expect(toKebabCase('brand_blue 2')).toBe('brand-blue-2')
  })
})

describe('strataWPTokens', () => {
  it('is off by default and not added by strataWP()', () => {
    expect(strataWP().map((p) => p.name)).not.toContain('stratawp:tokens')
    expect(strataWP({ tokens: true }).map((p) => p.name)).toContain('stratawp:tokens')
  })

  it('writes tokens.json and tokens.css to the build output', async () => {
    const root = mkdtempSync(join(tmpdir(), 'stratawp-tokens-'))
    writeFileSync(join(root, 'theme.json'), JSON.stringify(themeJson))
    writeFileSync(join(root, 'main.js'), 'export const x = 1\n')

    await build({
      root,
      logLevel: 'silent',
      configFile: false,
      build: {
        outDir: 'dist',
        rollupOptions: { input: join(root, 'main.js') },
      },
      plugins: [strataWPTokens({ outDir: 'tokens' })],
    })

    const json = JSON.parse(readFileSync(join(root, 'dist/tokens/tokens.json'), 'utf8'))
    expect(json.color[1]).toEqual({ slug: 'primary', name: 'Primary', value: '#0000ff' })
    const css = readFileSync(join(root, 'dist/tokens/tokens.css'), 'utf8')
    expect(css).toContain('--wp--preset--color--primary: #0000ff;')
  })
})
