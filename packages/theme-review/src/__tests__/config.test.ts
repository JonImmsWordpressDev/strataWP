import { afterEach, describe, expect, it } from 'vitest'
import { readConfig } from '../config'
import { ReviewError } from '../errors'
import { cleanupThemes, makeTheme } from './helpers'

afterEach(cleanupThemes)

const pkg = (stratawp: unknown) => JSON.stringify({ name: 'x', stratawp })

describe('readConfig', () => {
  it('returns defaults when there is no package.json', () => {
    expect(readConfig(makeTheme({ 'style.css': '/* */' }))).toEqual({
      themeType: undefined,
      ignore: [],
      rules: {},
    })
  })

  it('returns defaults when package.json has no stratawp field', () => {
    expect(readConfig(makeTheme({ 'package.json': '{"name":"x"}' })).rules).toEqual({})
  })

  it('reads themeType, ignore globs, and rule overrides (warn means warning)', () => {
    const config = readConfig(
      makeTheme({
        'package.json': pkg({
          themeType: 'block',
          review: { ignore: ['legacy/**'], rules: { 'THEME-005': 'off', 'THEME-008': 'warn' } },
        }),
      })
    )
    expect(config.themeType).toBe('block')
    expect(config.ignore).toEqual(['legacy/**'])
    expect(config.rules).toEqual({ 'THEME-005': 'off', 'THEME-008': 'warning' })
  })

  it('rejects an unknown themeType with a clear message', () => {
    expect(() => readConfig(makeTheme({ 'package.json': pkg({ themeType: 'headless' }) }))).toThrow(
      /Invalid stratawp\.themeType "headless".*block, classic or hybrid/
    )
  })

  it('rejects an invalid rule severity naming the rule', () => {
    const dir = makeTheme({ 'package.json': pkg({ review: { rules: { 'THEME-001': 'fatal' } } }) })
    expect(() => readConfig(dir)).toThrow(/Invalid severity "fatal" for rule THEME-001/)
  })

  it('reports malformed package.json as a ReviewError', () => {
    expect(() => readConfig(makeTheme({ 'package.json': '{nope' }))).toThrow(ReviewError)
  })

  it.each([
    [{ review: { ignore: 'vendor/**' } }, /stratawp\.review\.ignore must be an array of strings/],
    [{ review: { ignore: ['a', 1] } }, /stratawp\.review\.ignore must be an array of strings/],
    [{ review: { rules: ['THEME-001'] } }, /stratawp\.review\.rules must be an object/],
    [{ review: { rules: 'off' } }, /stratawp\.review\.rules must be an object/],
    [{ review: 'yes' }, /stratawp\.review must be an object/],
    [{ themeType: 3 }, /stratawp\.themeType/],
  ])('rejects wrong shapes: %j', (stratawp, message) => {
    const dir = makeTheme({ 'package.json': pkg(stratawp) })
    expect(() => readConfig(dir)).toThrow(ReviewError)
    expect(() => readConfig(dir)).toThrow(message)
  })

  it('rejects a non-object stratawp field', () => {
    const dir = makeTheme({ 'package.json': pkg('nope') })
    expect(() => readConfig(dir)).toThrow(/stratawp in package.json must be an object/)
  })

  it('reads a package.json with a leading BOM', () => {
    const dir = makeTheme({ 'package.json': '\uFEFF' + pkg({ themeType: 'block' }) })
    expect(readConfig(dir).themeType).toBe('block')
  })
})
