import { describe, it, expect } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { SKIP_DIRS } from './utils/theme-tokens.js'

/**
 * Lint for the advanced and store example themes.
 *
 * The examples were copied from the basic theme. Any residue of its
 * namespace, PHP prefix or text domain makes the theme checker report a
 * pattern-slug namespace that differs from the declared text domain, and
 * strings that can never load translations.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const examplesDir = path.join(__dirname, '..', '..', '..', 'examples')

const EXAMPLES = {
  'advanced-theme': 'strata-advanced',
  'store-theme': 'strata-store',
} as const

const BASIC_TOKENS = ['strata-basic', 'strata_basic', 'StrataBasic']

const TEXT_EXTENSIONS = new Set([
  '.php',
  '.css',
  '.scss',
  '.json',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.cts',
  '.html',
  '.md',
  '.txt',
])

function listTextFiles(dir: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        results.push(...listTextFiles(fullPath))
      }
    } else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath)
    }
  }
  return results
}

describe.each(Object.entries(EXAMPLES))('%s example', (exampleName, ownToken) => {
  const examplePath = path.join(examplesDir, exampleName)

  it('declares its own token as the Text Domain in style.css', () => {
    const styleCss = fs.readFileSync(path.join(examplePath, 'style.css'), 'utf-8')
    expect(styleCss.match(/^Text Domain:\s*(.+)$/m)?.[1].trim()).toBe(ownToken)
  })

  it('carries no trace of the basic theme namespace', () => {
    const offenders: string[] = []
    for (const file of listTextFiles(examplePath)) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const token of BASIC_TOKENS) {
        if (content.includes(token)) {
          offenders.push(`${path.relative(examplePath, file)}: ${token}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it("passes no 'frost' text domain in PHP", () => {
    const offenders: string[] = []
    for (const file of listTextFiles(examplePath)) {
      if (path.extname(file) !== '.php') continue
      if (/,\s*'frost'\s*\)/.test(fs.readFileSync(file, 'utf-8'))) {
        offenders.push(path.relative(examplePath, file))
      }
    }
    expect(offenders).toEqual([])
  })

  it('references only pattern slugs it registers (wp:pattern refs resolve)', () => {
    const registered = new Set<string>()
    for (const file of listTextFiles(path.join(examplePath, 'patterns'))) {
      const match = fs.readFileSync(file, 'utf-8').match(/^\s*\*\s*Slug:\s*(.+)$/m)
      if (match) {
        registered.add(match[1].trim())
      }
    }

    const unresolved: string[] = []
    for (const dir of ['templates', 'parts', 'patterns']) {
      for (const file of listTextFiles(path.join(examplePath, dir))) {
        const content = fs.readFileSync(file, 'utf-8')
        for (const match of content.matchAll(/wp:pattern\s+\{"slug":"([^"]+)"/g)) {
          if (!registered.has(match[1])) {
            unresolved.push(`${path.relative(examplePath, file)}: ${match[1]}`)
          }
        }
      }
    }
    expect(unresolved).toEqual([])
  })
})
