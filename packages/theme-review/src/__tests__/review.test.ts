import { afterEach, describe, expect, it } from 'vitest'
import { ReviewError } from '../errors'
import { DISCLAIMER, exitCodeFor, reviewTheme } from '../review'
import type { Rule } from '../types'
import {
  cleanupThemes,
  goodBlockFiles,
  goodClassicFiles,
  goodHybridFiles,
  makeTheme,
  without,
} from './helpers'

afterEach(cleanupThemes)

describe('reviewTheme', () => {
  it.each([
    ['hybrid', goodHybridFiles],
    ['block', goodBlockFiles],
    ['classic', goodClassicFiles],
  ] as const)('reports no findings for a good %s theme', (type, factory) => {
    const report = reviewTheme(makeTheme(factory()))
    expect(report.themeType).toBe(type)
    expect(report.typeSource).toBe('detected')
    expect(report.findings).toEqual([])
    expect(report.summary).toEqual({ errors: 0, warnings: 0, infos: 0 })
    expect(report.disclaimer).toBe(DISCLAIMER)
  })

  it('has the documented JSON shape', () => {
    const files = { ...without(goodHybridFiles(), 'readme.txt') }
    const report = reviewTheme(makeTheme(files))
    expect(Object.keys(report).sort()).toEqual([
      'disclaimer',
      'findings',
      'summary',
      'themeDir',
      'themeType',
      'typeSource',
    ])
    expect(report.findings).toHaveLength(1)
    expect(Object.keys(report.findings[0] as object).sort()).toEqual([
      'file',
      'message',
      'ruleId',
      'severity',
    ])
    expect(report.findings[0]).toMatchObject({
      ruleId: 'THEME-005',
      severity: 'warning',
      file: 'readme.txt',
    })
  })

  it('sorts errors before warnings, then by rule id and file', () => {
    const files = without(goodHybridFiles(), 'readme.txt', 'style.css')
    const ids = reviewTheme(makeTheme(files)).findings.map((f) => `${f.severity}:${f.ruleId}`)
    expect(ids[0]).toBe('error:THEME-001')
    expect(ids.indexOf('warning:THEME-005')).toBeGreaterThan(ids.indexOf('error:THEME-001'))
  })

  it('applies an explicit type override and records it', () => {
    const report = reviewTheme(makeTheme(goodHybridFiles()), { type: 'block' })
    expect(report.themeType).toBe('block')
    expect(report.typeSource).toBe('override')
  })

  it('lets package.json turn a rule off or change its severity', () => {
    const files = {
      ...without(goodHybridFiles(), 'readme.txt', 'screenshot.png'),
      'package.json': JSON.stringify({
        stratawp: { review: { rules: { 'THEME-005': 'off', 'THEME-003': 'warn' } } },
      }),
    }
    const report = reviewTheme(makeTheme(files))
    expect(report.findings.map((f) => f.ruleId)).toEqual(['THEME-003'])
    expect(report.findings[0]?.severity).toBe('warning')
  })

  it('honours review.ignore globs', () => {
    const files = {
      ...goodHybridFiles(),
      'legacy/old.php': '<?php eval( $x );',
      'package.json': JSON.stringify({ stratawp: { review: { ignore: ['legacy/**'] } } }),
    }
    expect(reviewTheme(makeTheme(files)).findings).toEqual([])
  })

  it('only runs rules that apply to the theme type', () => {
    const report = reviewTheme(makeTheme(without(goodClassicFiles(), 'index.php')))
    expect(report.findings.some((f) => f.ruleId === 'THEME-004')).toBe(true)
    const block = reviewTheme(makeTheme(without(goodBlockFiles(), 'index.php')))
    expect(block.findings.some((f) => f.ruleId === 'THEME-004')).toBe(false)
  })

  it('isolates a rule that throws: INTERNAL warning, other rules still run', () => {
    const boom: Rule = {
      id: 'THEME-999',
      description: 'always throws',
      severity: 'error',
      appliesTo: ['block', 'classic', 'hybrid'],
      check() {
        throw new Error('kaboom')
      },
    }
    const ok: Rule = {
      id: 'THEME-998',
      description: 'always finds one thing',
      severity: 'warning',
      appliesTo: ['block', 'classic', 'hybrid'],
      check: () => [{ message: 'still ran' }],
    }
    const report = reviewTheme(makeTheme(goodHybridFiles()), { rules: [boom, ok] })
    const internal = report.findings.find((f) => f.ruleId === 'INTERNAL')
    expect(internal?.severity).toBe('warning')
    expect(internal?.message).toContain('THEME-999')
    expect(internal?.message).toContain('kaboom')
    expect(report.findings.some((f) => f.message === 'still ran')).toBe(true)
  })

  it('throws a ReviewError for a missing directory', () => {
    expect(() => reviewTheme('/definitely/not/a/theme')).toThrow(ReviewError)
  })
})

describe('exitCodeFor', () => {
  const report = (errors: number, warnings: number) =>
    ({ summary: { errors, warnings, infos: 0 } }) as Parameters<typeof exitCodeFor>[0]

  it('is 0 with only warnings, 1 with errors', () => {
    expect(exitCodeFor(report(0, 3), false)).toBe(0)
    expect(exitCodeFor(report(1, 0), false)).toBe(1)
  })

  it('fails on warnings only with strict', () => {
    expect(exitCodeFor(report(0, 1), true)).toBe(1)
    expect(exitCodeFor(report(0, 0), true)).toBe(0)
  })
})
