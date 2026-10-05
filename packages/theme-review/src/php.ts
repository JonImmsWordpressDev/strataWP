const blank = (text: string): string => text.replace(/[^\n]/g, ' ')

/**
 * Returns `source` with everything that is not PHP code replaced by spaces:
 * HTML outside `<?php`/`<?=` tags and all comments. Newlines are kept so line
 * numbers stay stable, and string literals are kept so callers can read them.
 */
export function phpOnly(source: string): string {
  let out = ''
  let i = 0
  let inPhp = false
  const n = source.length

  while (i < n) {
    if (!inPhp) {
      const start = source.indexOf('<?', i)
      if (start === -1) {
        out += blank(source.slice(i))
        break
      }
      const tag = /^<\?(?:php\b|=)/i.exec(source.slice(start, start + 6))
      if (!tag) {
        out += blank(source.slice(i, start + 2))
        i = start + 2
        continue
      }
      out += blank(source.slice(i, start + tag[0].length))
      i = start + tag[0].length
      inPhp = true
      continue
    }

    const c = source.charAt(i)
    const next = source.charAt(i + 1)

    if (c === '?' && next === '>') {
      out += '  '
      i += 2
      inPhp = false
      continue
    }

    if ((c === '/' && next === '/') || (c === '#' && next !== '[')) {
      let j = i
      while (
        j < n &&
        source.charAt(j) !== '\n' &&
        !(source.charAt(j) === '?' && source.charAt(j + 1) === '>')
      ) {
        j++
      }
      out += blank(source.slice(i, j))
      i = j
      continue
    }

    if (c === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2)
      const j = end === -1 ? n : end + 2
      out += blank(source.slice(i, j))
      i = j
      continue
    }

    if (c === "'" || c === '"') {
      let j = i + 1
      while (j < n && source.charAt(j) !== c) {
        if (source.charAt(j) === '\\') j++
        j++
      }
      out += source.slice(i, Math.min(j + 1, n))
      i = j + 1
      continue
    }

    out += c
    i++
  }

  return out
}

/** 1-based line number of `index` in `source`. */
export function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

export interface Call {
  name: string
  args: string[]
  index: number
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Reads the top-level, comma-separated arguments of the call whose `(` is at `open`. */
function readArgs(code: string, open: number): string[] | undefined {
  const args: string[] = []
  let depth = 0
  let current = ''

  for (let i = open; i < code.length; i++) {
    const c = code.charAt(i)

    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < code.length && code.charAt(j) !== c) {
        if (code.charAt(j) === '\\') j++
        j++
      }
      current += code.slice(i, j + 1)
      i = j
      continue
    }

    if (c === '(' || c === '[' || c === '{') {
      depth++
      if (depth === 1) continue
    } else if (c === ')' || c === ']' || c === '}') {
      depth--
      if (depth === 0) {
        if (current.trim() !== '' || args.length > 0) args.push(current.trim())
        return args
      }
    } else if (c === ',' && depth === 1) {
      args.push(current.trim())
      current = ''
      continue
    }

    current += c
  }

  return undefined
}

/**
 * Finds calls to the named PHP functions in already-sanitized code (see
 * `phpOnly`). Method calls (`->`, `::`) and function declarations are skipped.
 */
export function extractCalls(code: string, names: readonly string[]): Call[] {
  const re = new RegExp(`(?<![\\w$>:])(${names.map(escapeRe).join('|')})\\s*\\(`, 'g')
  const calls: Call[] = []

  for (const match of code.matchAll(re)) {
    const index = match.index ?? 0
    const before = code.slice(Math.max(0, index - 12), index)
    if (/function\s+&?\s*$/.test(before)) continue
    const open = index + match[0].length - 1
    const args = readArgs(code, open)
    if (args) calls.push({ name: match[1] as string, args, index })
  }

  return calls
}
