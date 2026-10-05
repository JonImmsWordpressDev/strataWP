import { mkdirSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildContext, parseStyleHeader } from '../context'
import { cleanupThemes, makeTheme } from './helpers'

afterEach(cleanupThemes)

const config = { themeType: undefined, ignore: [] as string[], rules: {} }

describe('parseStyleHeader', () => {
  it('parses plain header lines', () => {
    expect(parseStyleHeader('/*\nTheme Name: A\nText Domain: a-b\n*/')).toEqual({
      'theme name': 'A',
      'text domain': 'a-b',
    })
  })

  it('parses Windows line endings and lines with leading asterisks', () => {
    const css = '/**\r\n * Theme Name: A\r\n * License URI: https://x.test/l\r\n */\r\nbody{}'
    expect(parseStyleHeader(css)).toEqual({ 'theme name': 'A', 'license uri': 'https://x.test/l' })
  })

  it('only reads the first comment block', () => {
    expect(parseStyleHeader('/* Theme Name: A */\n/* Version: 9 */')).toEqual({ 'theme name': 'A' })
  })

  it('returns an empty object when there is no comment', () => {
    expect(parseStyleHeader('body { color: red }')).toEqual({})
  })
})

describe('buildContext', () => {
  it('lists files as sorted POSIX paths and skips vendor, node_modules, dist, .git', () => {
    const dir = makeTheme({
      'b.php': '',
      'a.php': '',
      'vendor/x.php': '',
      'node_modules/y.js': '',
      'dist/z.js': '',
      '.git/config': '',
      'inc/c.php': '',
    })
    expect(buildContext(dir, 'classic', config).files).toEqual(['a.php', 'b.php', 'inc/c.php'])
  })

  it('applies generated-file and configured ignores', () => {
    const dir = makeTheme({ 'inc/blocks-generated.php': '', 'legacy/old.php': '', 'keep.php': '' })
    const ctx = buildContext(dir, 'classic', { ...config, ignore: ['legacy/**'] })
    expect(ctx.files).toEqual(['keep.php'])
  })

  it('exposes style header, text domain, read, readBytes and exists', () => {
    const dir = makeTheme({ 'style.css': '/*\nText Domain: dom\n*/', 'a.txt': 'hello' })
    const ctx = buildContext(dir, 'classic', config)
    expect(ctx.textDomain).toBe('dom')
    expect(ctx.read('a.txt')).toBe('hello')
    expect(ctx.readBytes('a.txt')?.length).toBe(5)
    expect(ctx.read('missing.txt')).toBeUndefined()
    expect(ctx.exists('a.txt')).toBe(true)
    expect(ctx.exists('missing.txt')).toBe(false)
  })

  it('does not follow a symlink loop inside the theme', () => {
    const dir = makeTheme({ 'a.php': '' })
    mkdirSync(join(dir, 'real'))
    symlinkSync(dir, join(dir, 'real', 'loop'))
    expect(buildContext(dir, 'classic', config).files).toEqual(['a.php'])
  })
})
