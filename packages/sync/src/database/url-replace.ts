// packages/sync/src/database/url-replace.ts
import type { UrlReplacement } from '../types.js'

export class UrlReplacer {
  private replacements: UrlReplacement[]

  constructor(replacements: UrlReplacement[]) {
    // Sort by length descending to replace longer URLs first
    this.replacements = [...replacements].sort((a, b) => b.from.length - a.from.length)
  }

  /**
   * Simple string replacement
   */
  replaceInString(input: string): string {
    let result = input
    for (const { from, to } of this.replacements) {
      result = result.split(from).join(to)
    }
    return result
  }

  /**
   * Replace URLs in PHP serialized strings, updating string lengths
   */
  replaceInSerialized(input: string): string {
    // Check if it looks like serialized PHP
    if (!this.isSerializedPHP(input)) {
      return this.replaceInString(input)
    }

    const walked = this.walkSerialized(input)
    if (walked === null) {
      // A string length that doesn't match its value: fall back to pattern matching
      return this.replaceInSerializedByPattern(input)
    }
    return walked.strings > 0 ? walked.output : this.replaceInString(input)
  }

  /**
   * Read each s:N:"..."; token by its declared byte length, so values holding
   * double quotes (HTML attributes) are found, and replace inside the value.
   * Returns null when a declared length doesn't land on the closing quote.
   */
  private walkSerialized(input: string): { output: string; strings: number } | null {
    const buf = Buffer.from(input, 'utf8')
    const parts: string[] = []
    let strings = 0
    let copyFrom = 0
    let i = 0

    while (i < buf.length) {
      const prev = i === 0 ? -1 : buf[i - 1]
      // A string token starts the input or follows ; { or }
      if (
        buf[i] === 0x73 &&
        buf[i + 1] === 0x3a &&
        (prev === -1 || prev === 0x3b || prev === 0x7b || prev === 0x7d)
      ) {
        let j = i + 2
        while (buf[j] >= 0x30 && buf[j] <= 0x39) j++
        if (j > i + 2 && buf[j] === 0x3a && buf[j + 1] === 0x22) {
          const start = j + 2
          const end = start + Number(buf.subarray(i + 2, j).toString('latin1'))
          if (buf[end] !== 0x22 || buf[end + 1] !== 0x3b) {
            return null
          }

          const value = buf.subarray(start, end).toString('utf8')
          // Serialized data stored inside a string (double serialization) gets its own lengths fixed
          const replaced = /^(?:a:\d+:\{|O:\d+:"|s:\d+:")/.test(value)
            ? this.replaceInSerialized(value)
            : this.replaceInString(value)

          parts.push(
            buf.subarray(copyFrom, i).toString('utf8'),
            `s:${Buffer.byteLength(replaced, 'utf8')}:"${replaced}";`
          )
          strings++
          i = end + 2
          copyFrom = i
          continue
        }
      }
      i++
    }

    parts.push(buf.subarray(copyFrom).toString('utf8'))
    return { output: parts.join(''), strings }
  }

  private replaceInSerializedByPattern(input: string): string {
    let result = input

    for (const { from, to } of this.replacements) {
      // Match serialized string pattern: s:LENGTH:"VALUE";
      const regex = new RegExp(`s:(\\d+):"([^"]*${this.escapeRegex(from)}[^"]*)";`, 'g')

      result = result.replace(regex, (_match, _length, value) => {
        const newValue = value.split(from).join(to)
        const newLength = Buffer.byteLength(newValue, 'utf8')
        return `s:${newLength}:"${newValue}";`
      })
    }

    return result
  }

  /**
   * Replace URLs in JSON strings (handles escaped slashes)
   */
  replaceInJSON(input: string): string {
    let result = input

    for (const { from, to } of this.replacements) {
      // Handle JSON-escaped URLs (forward slashes escaped as \/)
      const escapedFrom = from.replace(/\//g, '\\/')
      const escapedTo = to.replace(/\//g, '\\/')

      result = result.split(escapedFrom).join(escapedTo)
      // Also do regular replacement for non-escaped
      result = result.split(from).join(to)
    }

    return result
  }

  /**
   * Smart replacement that detects encoding type
   */
  replaceInSQL(sql: string): string {
    // Process line by line to handle different value types
    return sql
      .split('\n')
      .map((line) => {
        if (!line.includes('INSERT') && !line.includes('UPDATE')) {
          return line
        }

        // Extract values from INSERT/UPDATE statements
        return this.processLine(line)
      })
      .join('\n')
  }

  private processLine(line: string): string {
    // Match SQL string literals: 'value', with '' and backslash escapes inside
    return line.replace(/'(?:[^'\\]|''|\\.)*'/g, (match) => {
      // Work on the stored value, not its escaped SQL form, so serialized
      // lengths are counted on the real bytes
      const value = UrlReplacer.unescapeSQL(match.slice(1, -1))

      // Detect type and process accordingly
      let replaced: string
      if (this.isSerializedPHP(value)) {
        replaced = this.replaceInSerialized(value)
      } else if (this.isJSON(value)) {
        replaced = this.replaceInJSON(value)
      } else {
        replaced = this.replaceInString(value)
      }

      return replaced === value ? match : `'${UrlReplacer.escapeSQL(replaced)}'`
    })
  }

  /**
   * Decode the body of a MySQL string literal ('' and backslash escapes)
   */
  static unescapeSQL(str: string): string {
    const escapes: Record<string, string> = { '0': '\0', n: '\n', r: '\r', t: '\t', Z: '\x1a' }
    return str.replace(/''|\\(.)/gs, (_m, ch: string | undefined) =>
      ch === undefined ? "'" : (escapes[ch] ?? ch)
    )
  }

  /**
   * Encode a value as the body of a MySQL string literal, as DatabaseDumper does,
   * keeping control characters escaped so the statement stays on one line
   */
  static escapeSQL(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .replace(/\0/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .split('\x1a')
      .join('\\Z')
  }

  private isSerializedPHP(str: string): boolean {
    // Check for common PHP serialization patterns
    return /^[aOsidbN]:\d+/.test(str) || /^[aO]:\d+:\{/.test(str)
  }

  private isJSON(str: string): boolean {
    if (!str.startsWith('{') && !str.startsWith('[')) {
      return false
    }
    try {
      JSON.parse(str.replace(/\\'/g, "'"))
      return true
    } catch {
      return false
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Detect URLs in content and suggest replacements
   */
  static detectUrls(content: string): string[] {
    const urlRegex = /https?:\/\/[^\s"'<>]+/g
    const matches = content.match(urlRegex) || []
    return [...new Set(matches)]
  }
}
