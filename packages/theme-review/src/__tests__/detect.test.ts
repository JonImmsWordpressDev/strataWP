import { afterEach, describe, expect, it } from 'vitest'
import { ReviewError } from '../errors'
import { detectTheme } from '../detect'
import { cleanupThemes, makeTheme } from './helpers'

afterEach(cleanupThemes)

describe('detectTheme', () => {
  it('detects a block theme from templates/*.html', () => {
    const dir = makeTheme({ 'templates/index.html': '<!-- -->', 'theme.json': '{}' })
    expect(detectTheme(dir)).toEqual({ themeType: 'block', typeSource: 'detected' })
  })

  it('detects a classic theme from PHP template files', () => {
    const dir = makeTheme({ 'index.php': '<?php', 'header.php': '<?php', 'footer.php': '<?php' })
    expect(detectTheme(dir)).toEqual({ themeType: 'classic', typeSource: 'detected' })
  })

  it('detects a hybrid theme when both kinds of marker exist', () => {
    const dir = makeTheme({ 'templates/index.html': '<!-- -->', 'header.php': '<?php' })
    expect(detectTheme(dir)).toEqual({ themeType: 'hybrid', typeSource: 'detected' })
  })

  it('does not count index.php alone as a classic marker', () => {
    const dir = makeTheme({ 'templates/index.html': '<!-- -->', 'index.php': '<?php' })
    expect(detectTheme(dir).themeType).toBe('block')
  })

  it('falls back to classic when no markers exist', () => {
    expect(detectTheme(makeTheme({ 'style.css': '/* */' })).themeType).toBe('classic')
  })

  it('honours the package.json override', () => {
    const dir = makeTheme({
      'templates/index.html': '<!-- -->',
      'package.json': JSON.stringify({ stratawp: { themeType: 'hybrid' } }),
    })
    expect(detectTheme(dir)).toEqual({ themeType: 'hybrid', typeSource: 'override' })
  })

  it('lets an explicit override argument beat package.json', () => {
    const dir = makeTheme({ 'package.json': JSON.stringify({ stratawp: { themeType: 'hybrid' } }) })
    expect(detectTheme(dir, 'classic')).toEqual({ themeType: 'classic', typeSource: 'override' })
  })

  it('throws a ReviewError when the directory does not exist', () => {
    expect(() => detectTheme('/definitely/not/a/theme')).toThrow(ReviewError)
    expect(() => detectTheme('/definitely/not/a/theme')).toThrow(/Theme directory not found/)
  })

  it('rejects an invalid themeType in package.json', () => {
    const dir = makeTheme({ 'package.json': JSON.stringify({ stratawp: { themeType: 'nope' } }) })
    expect(() => detectTheme(dir)).toThrow(/Invalid stratawp\.themeType/)
  })
})
