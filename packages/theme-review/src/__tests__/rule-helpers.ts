import { buildContext } from '../context'
import { readConfig } from '../config'
import { detectTheme } from '../detect'
import type { Rule, RuleResult, ThemeType } from '../types'
import { makeTheme, type Files } from './helpers'

/** Runs one rule against a theme built from `files` (type detected unless given). */
export function runRule(rule: Rule, files: Files, type?: ThemeType): RuleResult[] {
  const dir = makeTheme(files)
  const { themeType } = detectTheme(dir, type)
  return rule.check(buildContext(dir, themeType, readConfig(dir)))
}
