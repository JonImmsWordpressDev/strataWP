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
})
