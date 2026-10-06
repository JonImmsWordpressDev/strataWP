import { describe, it, expect } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const THEMES = [
  'examples/basic-theme',
  'examples/advanced-theme',
  'examples/store-theme',
  'packages/cli/templates/basic-theme',
  'packages/cli/templates/advanced-theme',
  'packages/cli/templates/store-theme',
]

function pngSize(file: string): { width: number; height: number } {
  const buf = fs.readFileSync(file)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe.each(THEMES)('%s metadata', (theme) => {
  it('ships a 1200x900 screenshot.png', () => {
    expect(pngSize(path.join(root, theme, 'screenshot.png'))).toEqual({ width: 1200, height: 900 })
  })

  it('ships a readme.txt with the WordPress.org theme headers, matching style.css', () => {
    const readme = fs.readFileSync(path.join(root, theme, 'readme.txt'), 'utf8')
    const style = fs.readFileSync(path.join(root, theme, 'style.css'), 'utf8')
    const header = (name: string) =>
      style.match(new RegExp(`^\\s*${escapeRegExp(name)}:\\s*(.+)$`, 'mi'))?.[1]?.trim()
    expect(readme).toMatch(/^=== .+ ===/m)
    for (const field of [
      'Requires at least',
      'Tested up to',
      'Requires PHP',
      'License',
      'License URI',
    ]) {
      const value = header(field)
      expect(value, `${theme} style.css is missing ${field}`).toBeTruthy()
      expect(readme).toMatch(
        new RegExp(`^${escapeRegExp(field)}: ${escapeRegExp(value as string)}$`, 'm')
      )
    }
    expect(readme.match(/^=== (.+) ===$/m)?.[1]).toBe(header('Theme Name'))
    expect(readme.match(/^Tags:.*\r?\n\r?\n(.+)$/m)?.[1]).toBe(header('Description'))
    expect(readme).toMatch(/^== Description ==/m)
    expect(readme).toMatch(/^== Changelog ==/m)
  })
})
