/**
 * Design Tokens Plugin
 *
 * Reads the theme's theme.json at build and writes its presets as
 * tokens.json and tokens.css, so a decoupled frontend can use the same
 * palette, fonts, spacing and layout widths as the block editor.
 */
import type { Plugin } from 'vite'
import type { TokensOptions } from '../types'
import path from 'path'
import fs from 'fs'

interface ThemeJsonPreset {
  slug?: string
  name?: string
  [key: string]: unknown
}

export interface DesignTokens {
  color: { slug: string; name: string; value: string }[]
  gradient: { slug: string; name: string; value: string }[]
  fontFamily: { slug: string; name: string; value: string }[]
  fontSize: {
    slug: string
    name: string
    value: string
    fluid?: { min?: string; max?: string } | false
  }[]
  spacing: { slug: string; name: string; value: string }[]
  layout: { contentSize?: string; wideSize?: string }
}

/**
 * WordPress builds preset custom property names from the slug in kebab case
 * (`--wp--preset--color--{slug}`). Slugs in theme.json are usually kebab case
 * already; this covers camelCase, spaces and underscores.
 */
export function toKebabCase(slug: string): string {
  return slug
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function presets(list: unknown, valueKey: string) {
  if (!Array.isArray(list)) return []
  return (list as ThemeJsonPreset[])
    .filter((p) => p && typeof p.slug === 'string' && typeof p[valueKey] === 'string')
    .map((p) => ({
      slug: p.slug as string,
      name: typeof p.name === 'string' ? p.name : (p.slug as string),
      value: p[valueKey] as string,
    }))
}

/**
 * Map a parsed theme.json to design tokens. Only the theme's own presets are
 * included, not WordPress's defaults.
 */
export function themeJsonToTokens(themeJson: unknown): DesignTokens {
  const settings = ((themeJson as { settings?: Record<string, any> })?.settings ?? {}) as Record<
    string,
    any
  >
  const color = settings.color ?? {}
  const typography = settings.typography ?? {}
  const spacing = settings.spacing ?? {}
  const layout = settings.layout ?? {}

  const fontSizes = Array.isArray(typography.fontSizes)
    ? (typography.fontSizes as ThemeJsonPreset[])
        .filter((p) => p && typeof p.slug === 'string' && typeof p.size === 'string')
        .map((p) => {
          const token: DesignTokens['fontSize'][number] = {
            slug: p.slug as string,
            name: typeof p.name === 'string' ? p.name : (p.slug as string),
            value: p.size as string,
          }
          if (p.fluid === false || (p.fluid && typeof p.fluid === 'object')) {
            token.fluid = p.fluid as DesignTokens['fontSize'][number]['fluid']
          }
          return token
        })
    : []

  const layoutTokens: DesignTokens['layout'] = {}
  if (typeof layout.contentSize === 'string') layoutTokens.contentSize = layout.contentSize
  if (typeof layout.wideSize === 'string') layoutTokens.wideSize = layout.wideSize

  return {
    color: presets(color.palette, 'color'),
    gradient: presets(color.gradients, 'gradient'),
    fontFamily: presets(typography.fontFamilies, 'fontFamily'),
    fontSize: fontSizes,
    spacing: presets(spacing.spacingSizes, 'size'),
    layout: layoutTokens,
  }
}

/**
 * Render tokens as custom properties using WordPress's own names, so block
 * markup and frontend components resolve the same variables.
 */
export function tokensToCss(tokens: DesignTokens): string {
  const lines: string[] = []
  const groups: [string, { slug: string; value: string }[]][] = [
    ['color', tokens.color],
    ['gradient', tokens.gradient],
    ['font-family', tokens.fontFamily],
    ['font-size', tokens.fontSize],
    ['spacing', tokens.spacing],
  ]
  for (const [type, list] of groups) {
    for (const { slug, value } of list) {
      lines.push(`  --wp--preset--${type}--${toKebabCase(slug)}: ${value};`)
    }
  }
  if (tokens.layout.contentSize) {
    lines.push(`  --wp--style--global--content-size: ${tokens.layout.contentSize};`)
  }
  if (tokens.layout.wideSize) {
    lines.push(`  --wp--style--global--wide-size: ${tokens.layout.wideSize};`)
  }
  return `:root {\n${lines.join('\n')}\n}\n`
}

export function strataWPTokens(options: boolean | TokensOptions = false): Plugin {
  const opts: TokensOptions = typeof options === 'object' ? options : {}
  const enabled = typeof options === 'object' ? options.enabled !== false : options === true

  if (!enabled) {
    return {
      name: 'stratawp:tokens',
      apply: () => false,
    }
  }

  let root = process.cwd()
  const outDir = (opts.outDir ?? '').replace(/^\/+|\/+$/g, '')

  return {
    name: 'stratawp:tokens',
    apply: 'build',

    configResolved(config) {
      root = config.root
    },

    generateBundle() {
      const themeJsonPath = path.resolve(root, opts.themeJson ?? 'theme.json')
      if (!fs.existsSync(themeJsonPath)) {
        this.warn(`tokens: ${path.relative(root, themeJsonPath)} not found, no tokens written`)
        return
      }
      this.addWatchFile(themeJsonPath)

      let parsed: unknown
      try {
        parsed = JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'))
      } catch (error) {
        this.error(`tokens: could not parse ${themeJsonPath}: ${(error as Error).message}`)
      }

      const tokens = themeJsonToTokens(parsed)
      const fileName = (name: string) => (outDir ? `${outDir}/${name}` : name)

      this.emitFile({
        type: 'asset',
        fileName: fileName('tokens.json'),
        source: JSON.stringify(tokens, null, 2) + '\n',
      })
      this.emitFile({
        type: 'asset',
        fileName: fileName('tokens.css'),
        source: tokensToCss(tokens),
      })
    },
  }
}
