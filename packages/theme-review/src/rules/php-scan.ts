import { extractCalls, lineOf, phpOnly, stripStrings } from '../php'
import type { Rule, RuleResult, ThemeContext, ThemeType } from '../types'

const ALL: ThemeType[] = ['block', 'classic', 'hybrid']

const phpFiles = (ctx: ThemeContext): string[] => ctx.files.filter((file) => file.endsWith('.php'))
const codeOf = (ctx: ThemeContext, file: string): string => phpOnly(ctx.read(file) ?? '')

/** Index of the text-domain argument for each gettext function. */
const DOMAIN_ARG: Record<string, number> = {
  __: 1,
  _e: 1,
  esc_html__: 1,
  esc_html_e: 1,
  esc_attr__: 1,
  esc_attr_e: 1,
  _x: 2,
  esc_html_x: 2,
  esc_attr_x: 2,
  _n: 3,
  _nx: 4,
}

export const THEME_008: Rule = {
  id: 'THEME-008',
  description: "gettext calls use the theme's declared text domain",
  severity: 'warning',
  appliesTo: ALL,
  check(ctx) {
    const expected = ctx.textDomain
    if (!expected) return []
    const findings: RuleResult[] = []

    for (const file of phpFiles(ctx)) {
      const code = codeOf(ctx, file)
      const groups = new Map<string, { count: number; line: number }>()

      for (const call of extractCalls(code, Object.keys(DOMAIN_ARG))) {
        const arg = call.args[DOMAIN_ARG[call.name] as number]
        const literal = arg === undefined ? null : /^(['"])([^'"]*)\1$/.exec(arg)
        if (!literal) continue
        const domain = literal[2] as string
        if (domain === expected) continue
        const group = groups.get(domain)
        if (group) {
          group.count++
        } else {
          groups.set(domain, { count: 1, line: lineOf(code, call.index) })
        }
      }

      for (const [domain, group] of groups) {
        findings.push({
          message: `Text domain "${domain}" does not match the theme's "${expected}" (${group.count} call${group.count === 1 ? '' : 's'})`,
          file,
          line: group.line,
        })
      }
    }
    return findings
  },
}

export const THEME_009: Rule = {
  id: 'THEME-009',
  description: 'top-level PHP functions, classes and constants are prefixed or namespaced',
  severity: 'warning',
  appliesTo: ALL,
  check(ctx) {
    const textDomain = ctx.textDomain
    if (!textDomain) return []

    const prefix = textDomain.toLowerCase().replace(/[^a-z0-9]+/g, '_')
    const pascal = textDomain
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
    const findings: RuleResult[] = []

    for (const file of phpFiles(ctx)) {
      const code = codeOf(ctx, file)
      if (/^\s*namespace\s+[\w\\]+\s*[;{]/m.test(stripStrings(code))) continue

      for (const match of code.matchAll(/^function\s+&?\s*(\w+)\s*\(/gm)) {
        const name = match[1] as string
        if (!name.toLowerCase().startsWith(prefix)) {
          findings.push({
            message: `Function "${name}" is not prefixed with "${prefix}_"`,
            file,
            line: lineOf(code, match.index ?? 0),
          })
        }
      }

      for (const match of code.matchAll(/^(?:abstract\s+|final\s+)?class\s+(\w+)/gm)) {
        const name = match[1] as string
        if (!name.startsWith(pascal) && !name.toLowerCase().startsWith(prefix)) {
          findings.push({
            message: `Class "${name}" is not prefixed with "${pascal}" or namespaced`,
            file,
            line: lineOf(code, match.index ?? 0),
          })
        }
      }

      const constants = [
        ...code.matchAll(/^\s*define\s*\(\s*['"](\w+)['"]/gm),
        ...code.matchAll(/^const\s+(\w+)\s*=/gm),
      ]
      for (const match of constants) {
        const name = match[1] as string
        if (!name.toLowerCase().startsWith(prefix)) {
          findings.push({
            message: `Constant "${name}" is not prefixed with "${prefix.toUpperCase()}_"`,
            file,
            line: lineOf(code, match.index ?? 0),
          })
        }
      }
    }
    return findings
  },
}

export const THEME_010: Rule = {
  id: 'THEME-010',
  description: 'custom post types, taxonomies and shortcodes belong in a plugin',
  severity: 'warning',
  appliesTo: ALL,
  check(ctx) {
    const findings: RuleResult[] = []
    const re = /(?<![\w$])(?<!->)(?<!::)(register_post_type|register_taxonomy|add_shortcode)\s*\(/g

    for (const file of phpFiles(ctx)) {
      const code = stripStrings(codeOf(ctx, file))
      for (const match of code.matchAll(re)) {
        findings.push({
          message: `${match[1]}() is plugin territory; WordPress.org expects custom post types, taxonomies and shortcodes in a plugin`,
          file,
          line: lineOf(code, match.index ?? 0),
        })
      }
    }
    return findings
  },
}

const ENQUEUE_FUNCTIONS = [
  'wp_enqueue_script',
  'wp_enqueue_style',
  'wp_register_script',
  'wp_register_style',
]

export const THEME_011: Rule = {
  id: 'THEME-011',
  description: 'scripts and styles are bundled with the theme, not loaded from remote hosts',
  severity: 'warning',
  appliesTo: ALL,
  check(ctx) {
    const findings: RuleResult[] = []

    for (const file of ctx.files.filter((f) => f.endsWith('.php') || f.endsWith('.html'))) {
      const raw = ctx.read(file) ?? ''

      if (file.endsWith('.php')) {
        const code = phpOnly(raw)
        for (const call of extractCalls(code, ENQUEUE_FUNCTIONS)) {
          const src = call.args[1]
          if (src && /^['"](?:https?:)?\/\//i.test(src)) {
            findings.push({
              message: `${call.name}() loads a remote asset (${src.slice(1, -1)}); bundle assets with the theme instead`,
              file,
              line: lineOf(code, call.index),
            })
          }
        }
      }

      for (const match of raw.matchAll(/<(script|link)\b[^>]*>/gi)) {
        const tag = match[0]
        if (
          (match[1] as string).toLowerCase() === 'link' &&
          !/rel\s*=\s*["']stylesheet["']/i.test(tag)
        ) {
          continue
        }
        const url = /\b(?:src|href)\s*=\s*["']((?:https?:)?\/\/[^"']+)["']/i.exec(tag)
        if (url) {
          findings.push({
            message: `Remote ${(match[1] as string).toLowerCase()} asset (${url[1]}); bundle assets with the theme instead`,
            file,
            line: lineOf(raw, match.index ?? 0),
          })
        }
      }
    }
    return findings
  },
}

export const THEME_012: Rule = {
  id: 'THEME-012',
  description: 'no eval() or create_function(); base64_decode() is discouraged',
  severity: 'error',
  appliesTo: ALL,
  check(ctx) {
    const findings: RuleResult[] = []

    for (const file of phpFiles(ctx)) {
      const code = stripStrings(codeOf(ctx, file))

      for (const match of code.matchAll(/(?<![\w$])(?<!->)(?<!::)(eval|create_function)\s*\(/g)) {
        findings.push({
          message: `${match[1]}() is not allowed in themes`,
          file,
          line: lineOf(code, match.index ?? 0),
          severity: 'error',
        })
      }
      for (const match of code.matchAll(/(?<![\w$])(?<!->)(?<!::)base64_decode\s*\(/g)) {
        findings.push({
          message: 'base64_decode() is discouraged in themes; it is often used to hide code',
          file,
          line: lineOf(code, match.index ?? 0),
          severity: 'warning',
        })
      }
    }
    return findings
  },
}
