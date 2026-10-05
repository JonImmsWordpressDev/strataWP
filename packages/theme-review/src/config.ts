import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ReviewError } from './errors'
import type { SeverityOverride, ThemeType } from './types'

export const THEME_TYPES: readonly ThemeType[] = ['block', 'classic', 'hybrid']

const OVERRIDES = ['off', 'info', 'warn', 'warning', 'error']

export interface ReviewConfig {
  themeType: ThemeType | undefined
  ignore: string[]
  rules: Record<string, SeverityOverride>
}

export function isThemeType(value: unknown): value is ThemeType {
  return typeof value === 'string' && (THEME_TYPES as readonly string[]).includes(value)
}

/** Reads the `stratawp` field of the theme's package.json (all of it optional). */
export function readConfig(themeDir: string): ReviewConfig {
  const config: ReviewConfig = { themeType: undefined, ignore: [], rules: {} }
  const pkgPath = join(themeDir, 'package.json')
  if (!existsSync(pkgPath)) {
    return config
  }

  let pkg: any
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    throw new ReviewError(`package.json in ${themeDir} is not valid JSON`)
  }

  const stratawp = pkg?.stratawp
  if (!stratawp || typeof stratawp !== 'object') {
    return config
  }

  if (stratawp.themeType !== undefined) {
    if (!isThemeType(stratawp.themeType)) {
      throw new ReviewError(
        `Invalid stratawp.themeType "${String(stratawp.themeType)}" in package.json (expected block, classic or hybrid)`
      )
    }
    config.themeType = stratawp.themeType
  }

  const review = stratawp.review
  if (review && typeof review === 'object') {
    if (Array.isArray(review.ignore)) {
      config.ignore = review.ignore.filter(
        (glob: unknown): glob is string => typeof glob === 'string'
      )
    }
    if (review.rules && typeof review.rules === 'object') {
      for (const [id, value] of Object.entries(review.rules)) {
        if (typeof value !== 'string' || !OVERRIDES.includes(value)) {
          throw new ReviewError(
            `Invalid severity "${String(value)}" for rule ${id} in package.json stratawp.review.rules (expected off, info, warn or error)`
          )
        }
        config.rules[id] = value === 'warn' ? 'warning' : (value as SeverityOverride)
      }
    }
  }

  return config
}
