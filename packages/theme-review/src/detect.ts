import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isThemeType, readConfig } from './config'
import { ReviewError } from './errors'
import type { ThemeType } from './types'

/** Root PHP templates that mark a classic (or hybrid) theme. `index.php` alone does not count. */
export const CLASSIC_MARKERS = [
  'header.php',
  'footer.php',
  'sidebar.php',
  'home.php',
  'single.php',
  'page.php',
  'archive.php',
  'search.php',
  '404.php',
] as const

export interface ThemeTypeResult {
  themeType: ThemeType
  typeSource: 'detected' | 'override'
}

export function assertDirectory(dir: string): void {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new ReviewError(`Theme directory not found: ${dir}`)
  }
}

function hasBlockTemplates(themeDir: string): boolean {
  const dir = join(themeDir, 'templates')
  return existsSync(dir) && readdirSync(dir).some((name) => name.endsWith('.html'))
}

function hasClassicTemplates(themeDir: string): boolean {
  return CLASSIC_MARKERS.some((file) => existsSync(join(themeDir, file)))
}

/**
 * Block markers only means block, PHP markers only means classic, both means
 * hybrid. A theme with neither is treated as classic.
 */
export function detectThemeTypeFromFiles(themeDir: string): ThemeType {
  const block = hasBlockTemplates(themeDir)
  const classic = hasClassicTemplates(themeDir)
  if (block && classic) return 'hybrid'
  if (block) return 'block'
  return 'classic'
}

/**
 * Resolves the theme type: an explicit `override` argument wins, then
 * `stratawp.themeType` in package.json, then detection from the files.
 */
export function detectTheme(themeDir: string, override?: ThemeType): ThemeTypeResult {
  const dir = resolve(themeDir)
  assertDirectory(dir)

  if (override !== undefined) {
    if (!isThemeType(override)) {
      throw new ReviewError(
        `Invalid theme type "${String(override)}" (expected block, classic or hybrid)`
      )
    }
    return { themeType: override, typeSource: 'override' }
  }

  const configured = readConfig(dir).themeType
  if (configured) {
    return { themeType: configured, typeSource: 'override' }
  }

  return { themeType: detectThemeTypeFromFiles(dir), typeSource: 'detected' }
}
