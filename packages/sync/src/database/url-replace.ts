// packages/sync/src/database/url-replace.ts
import type { UrlReplacement } from '../types.js'

export class UrlReplacer {
  private replacements: UrlReplacement[]

  constructor(replacements: UrlReplacement[]) {
    // Sort by length descending to replace longer URLs first
    this.replacements = [...replacements].sort(
      (a, b) => b.from.length - a.from.length
    )
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

    let result = input

    for (const { from, to } of this.replacements) {
      // Match serialized string pattern: s:LENGTH:"VALUE";
      const regex = new RegExp(
        `s:(\\d+):"([^"]*${this.escapeRegex(from)}[^"]*)";`,
        'g'
      )

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
    return sql.split('\n').map((line) => {
      if (!line.includes('INSERT') && !line.includes('UPDATE')) {
        return line
      }

      // Extract values from INSERT/UPDATE statements
      return this.processLine(line)
    }).join('\n')
  }

  private processLine(line: string): string {
    // Match string values in SQL: 'value'
    return line.replace(/'([^'\\]|\\.)*'/g, (match) => {
      const value = match.slice(1, -1) // Remove quotes

      // Detect type and process accordingly
      if (this.isSerializedPHP(value)) {
        return `'${this.replaceInSerialized(value)}'`
      } else if (this.isJSON(value)) {
        return `'${this.replaceInJSON(value)}'`
      } else {
        return `'${this.replaceInString(value)}'`
      }
    })
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
