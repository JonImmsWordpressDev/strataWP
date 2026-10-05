import { phpOnly } from '../php'
import { readPngSize } from '../png'
import type { Rule, RuleResult, ThemeType } from '../types'

const ALL: ThemeType[] = ['block', 'classic', 'hybrid']

const HEADER_NAMES: Record<string, string> = {
  'theme name': 'Theme Name',
  version: 'Version',
  license: 'License',
  'license uri': 'License URI',
  'text domain': 'Text Domain',
  'tested up to': 'Tested up to',
  'requires at least': 'Requires at least',
  'requires php': 'Requires PHP',
  description: 'Description',
  author: 'Author',
}

const REQUIRED_HEADERS = ['theme name', 'version', 'license', 'license uri', 'text domain']
const RECOMMENDED_HEADERS = [
  'tested up to',
  'requires at least',
  'requires php',
  'description',
  'author',
]

export const THEME_001: Rule = {
  id: 'THEME-001',
  description: 'style.css has the required theme headers',
  severity: 'error',
  appliesTo: ALL,
  check(ctx) {
    if (!ctx.exists('style.css')) {
      return [{ message: 'style.css is missing', file: 'style.css' }]
    }
    return REQUIRED_HEADERS.filter((key) => !ctx.styleHeader[key]).map((key) => ({
      message: `style.css is missing the required header "${HEADER_NAMES[key]}"`,
      file: 'style.css',
    }))
  },
}

export const THEME_002: Rule = {
  id: 'THEME-002',
  description: 'style.css has the recommended theme headers',
  severity: 'warning',
  appliesTo: ALL,
  check(ctx) {
    if (!ctx.exists('style.css')) return []
    return RECOMMENDED_HEADERS.filter((key) => !ctx.styleHeader[key]).map((key) => ({
      message: `style.css is missing the recommended header "${HEADER_NAMES[key]}"`,
      file: 'style.css',
    }))
  },
}

const SCREENSHOT_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif']

export const THEME_003: Rule = {
  id: 'THEME-003',
  description: 'a screenshot exists and a PNG one is 1200×900',
  severity: 'error',
  appliesTo: ALL,
  check(ctx) {
    const file = SCREENSHOT_EXTENSIONS.map((ext) => `screenshot.${ext}`).find((name) =>
      ctx.exists(name)
    )
    if (!file) {
      return [{ message: 'screenshot.png is missing', file: 'screenshot.png', severity: 'error' }]
    }
    // Dimensions are only checked for PNG; other formats are accepted as-is.
    if (!file.endsWith('.png')) return []

    const size = readPngSize(ctx.readBytes(file) ?? Buffer.alloc(0))
    if (!size) {
      return [{ message: `${file} is not a valid PNG file`, file, severity: 'warning' }]
    }
    if (size.width !== 1200 || size.height !== 900) {
      return [
        {
          message: `${file} is ${size.width}×${size.height}; WordPress.org recommends 1200×900`,
          file,
          severity: 'warning',
        },
      ]
    }
    return []
  },
}

export const THEME_004: Rule = {
  id: 'THEME-004',
  description: 'index.php exists',
  severity: 'error',
  appliesTo: ['classic', 'hybrid'],
  check(ctx) {
    return ctx.exists('index.php') ? [] : [{ message: 'index.php is missing', file: 'index.php' }]
  },
}

export const THEME_005: Rule = {
  id: 'THEME-005',
  description: 'readme.txt exists',
  severity: 'warning',
  appliesTo: ALL,
  check(ctx) {
    return ctx.exists('readme.txt')
      ? []
      : [{ message: 'readme.txt is missing', file: 'readme.txt' }]
  },
}

export const THEME_006: Rule = {
  id: 'THEME-006',
  description: 'block themes have templates/index.html and a valid theme.json',
  severity: 'error',
  appliesTo: ['block', 'hybrid'],
  check(ctx) {
    const findings: RuleResult[] = []

    const hasIndex = ctx.exists('templates/index.html')
    const text = ctx.read('theme.json')
    // A hybrid theme may be classic with a stray template or theme.json: only insist on the
    // pair once it has started to be a block theme.
    const enforce = ctx.themeType !== 'hybrid' || hasIndex || text !== undefined

    if (!hasIndex && enforce) {
      findings.push({ message: 'templates/index.html is missing', file: 'templates/index.html' })
    }

    if (text === undefined) {
      if (enforce) findings.push({ message: 'theme.json is missing', file: 'theme.json' })
      return findings
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text.replace(/^\uFEFF/, ''))
    } catch {
      findings.push({ message: 'theme.json is not valid JSON', file: 'theme.json' })
      return findings
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      findings.push({ message: 'theme.json must be a JSON object', file: 'theme.json' })
      return findings
    }
    const json = parsed as Record<string, unknown>

    if (json['$schema'] === undefined) {
      findings.push({
        message: 'theme.json is missing "$schema"',
        file: 'theme.json',
        severity: 'warning',
      })
    }
    if (json['version'] === undefined || json['version'] === null) {
      findings.push({ message: 'theme.json is missing "version"', file: 'theme.json' })
    }
    return findings
  },
}

export const THEME_007: Rule = {
  id: 'THEME-007',
  description: 'pattern files declare a Title and a namespaced Slug that matches the text domain',
  severity: 'warning',
  appliesTo: ['block', 'hybrid'],
  check(ctx) {
    const findings: RuleResult[] = []
    const patterns = ctx.files.filter((file) => /^patterns\/[^/]+\.php$/.test(file))

    for (const file of patterns) {
      const head = (ctx.read(file) ?? '').slice(0, 8192)
      // Every comment in the scanned window, including a trailing unterminated one, and the
      // first that declares a Title or Slug is the header (a licence block may come first).
      const comments = head.match(/\/\*[\s\S]*?(?:\*\/|$)/g) ?? []
      const block = comments.find((c) => /^\s*\*?\s*(?:Title|Slug):/im.test(c)) ?? ''
      const title = /^\s*\*?\s*Title:\s*(.+)$/im.exec(block)
      const slug = /^\s*\*?\s*Slug:\s*(\S+)/im.exec(block)?.[1]

      if (!title) {
        findings.push({ message: `${file} is missing a "Title:" header`, file })
      }
      if (!slug) {
        findings.push({ message: `${file} is missing a "Slug:" header`, file })
        continue
      }
      if (!slug.includes('/')) {
        findings.push({
          message: `${file}: slug "${slug}" should be namespaced like "${ctx.textDomain ?? 'theme'}/name"`,
          file,
        })
        continue
      }
      const namespace = slug.split('/')[0] as string
      if (ctx.textDomain && namespace !== ctx.textDomain) {
        findings.push({
          message: `${file}: slug namespace "${namespace}" does not match the text domain "${ctx.textDomain}"`,
          file,
        })
      }
    }
    return findings
  },
}

export const THEME_013: Rule = {
  id: 'THEME-013',
  description: 'classic and hybrid themes call wp_head() and wp_footer()',
  severity: 'error',
  appliesTo: ['classic', 'hybrid'],
  check(ctx) {
    const code = ctx.files
      .filter((file) => file.endsWith('.php'))
      .map((file) => phpOnly(ctx.read(file) ?? ''))
    const findings: RuleResult[] = []

    if (!code.some((text) => /\bwp_head\s*\(/.test(text))) {
      findings.push({
        message: 'No template calls wp_head(); add it to header.php',
        file: 'header.php',
      })
    }
    if (!code.some((text) => /\bwp_footer\s*\(/.test(text))) {
      findings.push({
        message: 'No template calls wp_footer(); add it to footer.php',
        file: 'footer.php',
      })
    }
    return findings
  },
}
