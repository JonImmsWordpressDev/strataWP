import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReviewConfig } from './config'
import { globToRegExp } from './glob'
import type { ThemeContext, ThemeType } from './types'

/** Directories never reviewed, at any depth. */
const PRUNE = new Set(['vendor', 'node_modules', 'dist', '.git', '.turbo', '.vite'])

const ALWAYS_IGNORE = ['**/*-generated.*']

function walk(root: string, rel = ''): string[] {
  const out: string[] = []
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name
    // Explicit documentation: withFileTypes Dirents do not follow links, so symlinks are
    // already neither file nor directory. Do not swap in statSync without keeping this intent.
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      if (!PRUNE.has(entry.name)) out.push(...walk(root, relPath))
      continue
    }
    if (entry.isFile()) out.push(relPath)
  }
  return out.sort()
}

/** Parses the first comment block of style.css into lowercase-keyed fields. */
export function parseStyleHeader(css: string): Record<string, string> {
  const header: Record<string, string> = {}
  const block = /\/\*([\s\S]*?)\*\//.exec(css)
  if (!block) return header

  for (const raw of (block[1] ?? '').split(/\r?\n/)) {
    const line = raw.replace(/^\s*\*?\s*/, '')
    const match = /^([A-Za-z][A-Za-z0-9 _-]*?)\s*:\s*(.+?)\s*$/.exec(line)
    if (match) header[(match[1] as string).toLowerCase()] = match[2] as string
  }
  return header
}

export function buildContext(
  themeDir: string,
  themeType: ThemeType,
  config: ReviewConfig
): ThemeContext {
  const ignore = [...ALWAYS_IGNORE, ...config.ignore].map(globToRegExp)
  const files = walk(themeDir).filter((file) => !ignore.some((re) => re.test(file)))

  const cache = new Map<string, Buffer | undefined>()
  const readBytes = (rel: string): Buffer | undefined => {
    if (!cache.has(rel)) {
      try {
        cache.set(rel, readFileSync(join(themeDir, rel)))
      } catch {
        cache.set(rel, undefined)
      }
    }
    return cache.get(rel)
  }
  const read = (rel: string): string | undefined => readBytes(rel)?.toString('utf8')

  const styleHeader = parseStyleHeader(read('style.css') ?? '')

  return {
    themeDir,
    themeType,
    textDomain: styleHeader['text domain'],
    styleHeader,
    files,
    exists: (rel) => existsSync(join(themeDir, rel)),
    read,
    readBytes,
  }
}
