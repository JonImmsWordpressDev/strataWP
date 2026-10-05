const blank = (text: string): string => text.replace(/[^\n]/g, ' ')

/**
 * If a heredoc/nowdoc opener (`<<<LABEL`, `<<<'LABEL'`, `<<<"LABEL"`) starts at `i`, returns
 * where the opener ends and where the body ends (the start of the closing label's line, or the
 * end of input when it never closes).
 */
function heredocAt(code: string, i: number): { openerEnd: number; bodyEnd: number } | undefined {
  if (code.charAt(i) !== '<' || code.charAt(i + 1) !== '<' || code.charAt(i + 2) !== '<') {
    return undefined
  }
  const opener = /^<<<[ \t]*(['"]?)(\w+)\1/.exec(code.slice(i, i + 200))
  if (!opener) return undefined
  const openerEnd = i + opener[0].length
  const closing = new RegExp(`\\n[ \\t]*${opener[2]}(?!\\w)`, 'g')
  closing.lastIndex = openerEnd
  const found = closing.exec(code)
  return { openerEnd, bodyEnd: found ? found.index + 1 : code.length }
}

/**
 * Returns `source` with everything that is not PHP code replaced by spaces:
 * HTML outside `<?php`/`<?=` tags and all comments. Newlines are kept so line
 * numbers stay stable, and string literals are kept so callers can read them.
 * Heredoc/nowdoc bodies are blanked too (the opener and closing label stay).
 *
 * Limitation: backtick strings are scanned as code.
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

    if (c === '<') {
      const heredoc = heredocAt(source, i)
      if (heredoc) {
        out +=
          source.slice(i, heredoc.openerEnd) +
          blank(source.slice(heredoc.openerEnd, heredoc.bodyEnd))
        i = heredoc.bodyEnd
        continue
      }
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

/**
 * Takes already-sanitized code (see `phpOnly`) and blanks the body of every
 * single- and double-quoted string, keeping the quotes and newlines. Lets
 * callers match code constructs without hitting text inside strings. An
 * unterminated string is blanked to the end of the input.
 */
export function stripStrings(code: string): string {
  let out = ''
  let i = 0
  const n = code.length

  while (i < n) {
    const c = code.charAt(i)
    if (c === '<') {
      const heredoc = heredocAt(code, i)
      if (heredoc) {
        out +=
          code.slice(i, heredoc.openerEnd) + blank(code.slice(heredoc.openerEnd, heredoc.bodyEnd))
        i = heredoc.bodyEnd
        continue
      }
    }
    if (c !== "'" && c !== '"') {
      out += c
      i++
      continue
    }
    let j = i + 1
    while (j < n && code.charAt(j) !== c) {
      if (code.charAt(j) === '\\') j++
      j++
    }
    const end = Math.min(j, n)
    out += c + blank(code.slice(i + 1, end))
    if (j < n) out += c
    i = j + 1
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
  const re = new RegExp(`(?<![\\w$])(?<!->)(?<!::)(${names.map(escapeRe).join('|')})\\s*\\(`, 'g')
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
