import { resolve } from 'node:path'
import { readConfig } from './config'
import { buildContext } from './context'
import { assertDirectory, detectTheme } from './detect'
import { RULES } from './rules'
import type { Finding, Report, Rule, Severity, ThemeType } from './types'

export const DISCLAIMER =
  'This review approximates the WordPress.org theme guidelines using static checks. It is not a certification, and passing it does not guarantee acceptance.'

const ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 }

export interface ReviewOptions {
  /** Overrides detection and package.json. */
  type?: ThemeType
  /** Test hook: replaces the registered rule set. */
  rules?: Rule[]
}

export function reviewTheme(themeDir: string, options: ReviewOptions = {}): Report {
  const dir = resolve(themeDir)
  assertDirectory(dir)

  const config = readConfig(dir)
  const { themeType, typeSource } = detectTheme(dir, options.type)
  const ctx = buildContext(dir, themeType, config)
  const findings: Finding[] = []

  for (const rule of options.rules ?? RULES) {
    if (!rule.appliesTo.includes(themeType)) continue
    const override = config.rules[rule.id]
    if (override === 'off') continue

    let results
    try {
      results = rule.check(ctx)
    } catch (error) {
      findings.push({
        ruleId: 'INTERNAL',
        severity: 'warning',
        message: `Rule ${rule.id} crashed and was skipped: ${error instanceof Error ? error.message : String(error)}`,
      })
      continue
    }

    for (const result of results) {
      findings.push({
        ruleId: rule.id,
        severity: override ?? result.severity ?? rule.severity,
        message: result.message,
        ...(result.file !== undefined && { file: result.file }),
        ...(result.line !== undefined && { line: result.line }),
      })
    }
  }

  findings.sort(
    (a, b) =>
      ORDER[a.severity] - ORDER[b.severity] ||
      a.ruleId.localeCompare(b.ruleId) ||
      (a.file ?? '').localeCompare(b.file ?? '') ||
      (a.line ?? 0) - (b.line ?? 0)
  )

  return {
    themeDir: dir,
    themeType,
    typeSource,
    summary: {
      errors: findings.filter((f) => f.severity === 'error').length,
      warnings: findings.filter((f) => f.severity === 'warning').length,
      infos: findings.filter((f) => f.severity === 'info').length,
    },
    findings,
    disclaimer: DISCLAIMER,
  }
}

/** 0 pass; 1 on errors (or on warnings when `strict`). */
export function exitCodeFor(report: Report, strict: boolean): number {
  if (report.summary.errors > 0) return 1
  if (strict && report.summary.warnings > 0) return 1
  return 0
}
