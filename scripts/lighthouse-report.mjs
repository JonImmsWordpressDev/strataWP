#!/usr/bin/env node
/**
 * Turn Lighthouse CI filesystem output into a markdown gap report.
 *
 * For every audit that keeps a category under 100 (or breaks a metric budget
 * in .lighthouserc.cjs) the report lists the audit id and score, the offending
 * elements or URLs with their measured values from the LHR `details`, the theme
 * file that most likely causes it, and the fix with where it belongs.
 *
 * Usage:
 *   node scripts/lighthouse-report.mjs --theme basic-theme \
 *     [--dir lighthouse-reports] [--out lighthouse-reports/report.md]
 *
 * `--dir` holds one folder per preset (mobile/, desktop/), each with the
 * manifest.json that `lhci upload --target=filesystem` writes. The report is
 * also appended to $GITHUB_STEP_SUMMARY when that is set. It never fails the
 * build: the `lhci assert` step does that.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MAX_ITEMS = 5
const SOURCE_DIRS = ['templates', 'parts', 'patterns', 'src', 'inc']
const SOURCE_FILES = ['theme.json', 'functions.php', 'style.css']
const SOURCE_EXT = /\.(html|php|scss|css|json|ts|tsx|js)$/

/** Known audits: the usual cause in a StrataWP theme, the fix, and who owns it. */
export const FIXES = {
  'color-contrast': {
    owner: 'theme',
    fix: 'Raise the contrast of the foreground/background pair (4.5:1 for body text, 3:1 for large text) in the theme.json palette or in the pattern that sets the colors.',
  },
  'image-alt': {
    owner: 'theme',
    fix: 'Give the image an `alt` (empty `alt=""` when decorative) in the pattern or template that outputs it.',
  },
  'link-name': {
    owner: 'theme',
    fix: 'Give the link discernible text (visible text or `aria-label`) in the template part or pattern.',
  },
  'button-name': {
    owner: 'theme',
    fix: 'Give the button discernible text or an `aria-label`.',
  },
  'heading-order': {
    owner: 'theme',
    fix: 'Use sequential heading levels (no skipped levels) in the template or pattern.',
  },
  'html-has-lang': {
    owner: 'theme',
    fix: 'Print `language_attributes()` on `<html>` (block themes get it from core).',
  },
  'document-title': {
    owner: 'theme',
    fix: "Declare `add_theme_support( 'title-tag' )` (stratawp/core Setup does this).",
  },
  'meta-description': {
    owner: 'stratawp/core',
    fix: 'Print a `<meta name="description">` (for example from the site tagline) when no SEO plugin does, or allowlist it as plugin territory.',
  },
  'unsized-images': {
    owner: 'theme',
    fix: 'Set explicit `width` and `height` on the image in the pattern, or render it through a core image block with dimensions.',
  },
  'image-size-responsive': {
    owner: 'stratawp/core',
    fix: 'Serve a `srcset` that matches the rendered size (ImageSizes component) or use a larger source image.',
  },
  'uses-responsive-images': {
    owner: 'stratawp/core',
    fix: 'Tune the `sizes` attribute (ImageSizes component) so the browser picks a smaller candidate.',
  },
  'modern-image-formats': {
    owner: 'vite-plugin',
    fix: 'Serve the AVIF/WebP siblings the Vite plugin image optimizer emits, or convert the uploaded media.',
  },
  'render-blocking-resources': {
    owner: 'stratawp/core',
    fix: 'Inline critical CSS (CriticalCss component) and load the rest non-blocking (ConditionalStyles); defer scripts via `stratawp_defer_scripts`.',
  },
  'render-blocking-insight': {
    owner: 'stratawp/core',
    fix: 'Inline critical CSS (CriticalCss component) and load the rest non-blocking (ConditionalStyles); defer scripts via `stratawp_defer_scripts`.',
  },
  'unused-css-rules': {
    owner: 'theme',
    fix: 'Drop unused rules from the theme SCSS, or move page-specific rules into a conditional stylesheet.',
  },
  'unused-javascript': {
    owner: 'vite-plugin',
    fix: 'Split the bundle (manualChunks) or load the script only where it is used.',
  },
  'uses-long-cache-ttl': {
    owner: 'outside our control',
    fix: 'Static asset caching is server configuration; wp-env serves no cache headers. Allowlist on wp-env or set headers on the host.',
  },
  'font-display': {
    owner: 'theme',
    fix: 'Set `font-display: swap` (or `optional`) on the `@font-face` rules / theme.json `fontFace` entries.',
  },
  'lcp-lazy-loaded': {
    owner: 'stratawp/core',
    fix: 'Do not lazy-load the LCP image; set `loading="eager"` and `fetchpriority="high"` on it.',
  },
  'prioritize-lcp-image': {
    owner: 'stratawp/core',
    fix: 'Preload the LCP image or give it `fetchpriority="high"`.',
  },
  'errors-in-console': {
    owner: 'theme',
    fix: 'Fix the console error at the logged URL (a 404 favicon means the theme or site has no site icon).',
  },
  'inspector-issues': {
    owner: 'theme',
    fix: 'Resolve the issue Chrome DevTools logs in the Issues panel for this page.',
  },
  'third-party-cookies': {
    owner: 'outside our control',
    fix: 'Remove the third-party embed that sets cookies, or allowlist it.',
  },
  'is-crawlable': {
    owner: 'outside our control',
    fix: 'The site is set to discourage search engines (`blog_public = 0`); enable indexing on the test site.',
  },
  'crawlable-anchors': {
    owner: 'theme',
    fix: 'Give every link a real `href` in the template part or pattern.',
  },
  'link-text': {
    owner: 'theme',
    fix: 'Replace generic link text ("click here", "read more") with descriptive text.',
  },
  'font-size': {
    owner: 'theme',
    fix: 'Keep body and small text at 12px or more in the theme.json `fontSizes` presets and the SCSS.',
  },
  viewport: {
    owner: 'theme',
    fix: 'Print `<meta name="viewport" content="width=device-width, initial-scale=1">` (block themes get it from core).',
  },
}

const METRIC_FIX = {
  owner: 'theme or stratawp/core',
  fix: 'See the diagnostics below for what delays this metric.',
}

export function fixFor(auditId) {
  return FIXES[auditId] ?? null
}

export function docsLink(description = '') {
  const match = description.match(/\[[^\]]*\]\((https?:[^)]+)\)/)
  return match ? match[1] : null
}

/** Escape for a markdown table cell and keep it short. */
export function cell(value, max = 160) {
  let text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length > max) text = `${text.slice(0, max - 1)}…`
  return text.replace(/\|/g, '\\|')
}

function code(value, max) {
  const text = cell(value, max).replace(/`/g, "'")
  return text ? `\`${text}\`` : ''
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KiB`
  return `${Math.round(bytes)} B`
}

/** The offending element or URL for one `details.items` entry. */
export function itemTarget(item) {
  if (item.node?.snippet || item.node?.selector) {
    const { nodeLabel, selector } = item.node
    const label = nodeLabel && nodeLabel !== selector ? ` ("${cell(nodeLabel, 60)}")` : ''
    return `${code(item.node.snippet || item.node.selector, 120)}${label}`
  }
  const url = item.url ?? item.source?.url ?? item.sourceLocation?.url
  if (url) return code(url, 120)
  if (item.description) return cell(item.description, 120)
  return ''
}

/** The measured value for one `details.items` entry. */
export function itemValue(item) {
  const parts = []
  if (item.node?.explanation) {
    const lines = item.node.explanation.split('\n').map((line) => line.trim())
    parts.push(lines.find((line) => line && !/^Fix (any|all) of the following:?$/.test(line)) ?? '')
  }
  if (typeof item.wastedMs === 'number' && item.wastedMs > 0) {
    parts.push(`${Math.round(item.wastedMs)} ms wasted`)
  }
  if (typeof item.wastedBytes === 'number' && item.wastedBytes > 0) {
    parts.push(`${formatBytes(item.wastedBytes)} wasted`)
  }
  if (typeof item.totalBytes === 'number' && !parts.length) parts.push(formatBytes(item.totalBytes))
  if (item.displayedSize) {
    parts.push(
      `displayed ${item.displayedSize}, actual ${item.actualSize}, expected ${item.expectedSize}`
    )
  }
  if (typeof item.cacheLifetimeMs === 'number') parts.push(`cache TTL ${item.cacheLifetimeMs} ms`)
  if (item.description && (item.node || item.url || item.sourceLocation)) {
    parts.push(item.description)
  }
  return cell(parts.filter(Boolean).join('; '))
}

/** Class names in an element snippet that a theme file could own. */
export function themeClasses(snippet = '') {
  const match = snippet.match(/class="([^"]*)"/)
  if (!match) return []
  return match[1]
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (name) =>
        !/^(wp-block-|wp-container-|wp-elements-|is-|has-text-color$|has-background$|has-link-color$|alignwide$|alignfull$|screen-reader-text$)/.test(
          name
        ) &&
        !/^has-[a-z0-9-]+-(color|background-color|font-size|gradient-background|font-family)$/.test(
          name
        )
    )
}

const PRESET_KINDS = {
  color: 'color',
  'background-color': 'color',
  'font-size': 'fontSize',
  'gradient-background': 'gradient',
  'font-family': 'fontFamily',
}

/** theme.json preset slugs referenced by `has-<slug>-color` style classes. */
export function presetSlugs(snippet = '') {
  const found = []
  for (const match of snippet.matchAll(
    /\bhas-([a-z0-9-]+?)-(color|background-color|font-size|gradient-background|font-family)\b/g
  )) {
    if (match[1] === 'text' || match[1] === 'link') continue
    found.push(`${PRESET_KINDS[match[2]]} \`${match[1]}\``)
  }
  return found
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'vendor' && entry.name !== 'dist')
        walk(full, out)
    } else if (SOURCE_EXT.test(entry.name)) out.push(full)
  }
  return out
}

/** Index of the theme's source files: relative path -> contents. */
export function loadThemeSources(themeDir) {
  const files = new Map()
  if (!themeDir || !existsSync(themeDir)) return files
  const candidates = [
    ...SOURCE_DIRS.flatMap((dir) => walk(path.join(themeDir, dir))),
    ...SOURCE_FILES.map((file) => path.join(themeDir, file)).filter((file) => existsSync(file)),
  ]
  for (const file of candidates) {
    files.set(path.relative(themeDir, file).split(path.sep).join('/'), readFileSync(file, 'utf8'))
  }
  return files
}

function filesMentioning(sources, needle, limit = 3) {
  const hits = []
  for (const [file, text] of sources) {
    if (text.includes(needle)) hits.push(file)
    if (hits.length >= limit) break
  }
  return hits
}

/**
 * Where an item most likely comes from: a theme file, stratawp/core, a
 * WordPress core or plugin asset, or a third party.
 */
export function attributeSource(item, { theme, themePath, sources = new Map() } = {}) {
  const url = item.url ?? item.source?.url ?? item.sourceLocation?.url
  if (url) {
    let parsed
    try {
      parsed = new URL(url)
    } catch {
      parsed = null
    }
    const pathname = parsed?.pathname ?? url
    const themePrefix = `/wp-content/themes/${theme}/`
    if (pathname.includes(`${themePrefix}vendor/stratawp/core/`)) return 'stratawp/core asset'
    if (pathname.includes(`${themePrefix}dist/`)) {
      const built = pathname.slice(pathname.indexOf(themePrefix) + themePrefix.length)
      return `theme build \`${built}\` (source under \`${themePath}/src/\`)`
    }
    if (pathname.includes(themePrefix)) {
      return `theme file \`${themePath}/${pathname.slice(pathname.indexOf(themePrefix) + themePrefix.length)}\``
    }
    if (pathname.includes('/wp-includes/') || pathname.includes('/wp-admin/')) {
      return 'WordPress core asset'
    }
    if (pathname.includes('/wp-content/plugins/')) {
      return `plugin \`${pathname.split('/wp-content/plugins/')[1].split('/')[0]}\``
    }
    if (pathname.includes('/wp-content/uploads/')) return 'media library upload (site content)'
    if (parsed && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
      return `third party (\`${parsed.hostname}\`)`
    }
  }

  const snippet = item.node?.snippet ?? ''
  if (snippet) {
    for (const name of themeClasses(snippet)) {
      const hits = filesMentioning(sources, name)
      if (hits.length) return hits.map((file) => `\`${themePath}/${file}\``).join(', ')
    }
    const presets = presetSlugs(snippet)
    if (presets.length) return `\`${themePath}/theme.json\` preset ${presets.join(', ')}`
    const block = snippet.match(/\bwp-block-([a-z0-9-]+)/)
    if (block) return `core block \`${block[1]}\` markup in a template, part or pattern`
  }
  if (url) return 'page document (WordPress output)'
  return ''
}

/** Audits that keep a category under 100, worst first. */
export function failingAudits(lhr, allowlist = []) {
  const allowed = new Map(allowlist.map((entry) => [entry.audit, entry.reason]))
  const rows = new Map()
  for (const category of Object.values(lhr.categories ?? {})) {
    for (const ref of category.auditRefs ?? []) {
      const audit = lhr.audits?.[ref.id]
      if (!audit || audit.score === null || audit.score === undefined || audit.score >= 1) continue
      if (audit.scoreDisplayMode === 'informative' || audit.scoreDisplayMode === 'manual') continue
      const weighted = ref.weight > 0
      // Weight-0 performance audits explain a low performance score; skip them at 100.
      if (!weighted && (category.id !== 'performance' || category.score >= 1)) continue
      const seen = rows.get(audit.id)
      if (seen) {
        seen.categories.push(category.id)
        seen.weighted ||= weighted
        continue
      }
      rows.set(audit.id, {
        categories: [category.id],
        weighted,
        audit,
        allowlisted: allowed.get(audit.id) ?? null,
      })
    }
  }
  return [...rows.values()].sort(
    (a, b) => Number(b.weighted) - Number(a.weighted) || a.audit.score - b.audit.score
  )
}

/** Metric budgets (maxNumericValue) from the lhci assertions that the run breaks. */
export function budgetBreaches(lhr, assertions = {}) {
  const breaches = []
  for (const [id, assertion] of Object.entries(assertions)) {
    if (!Array.isArray(assertion)) continue
    const max = assertion[1]?.maxNumericValue
    const audit = lhr.audits?.[id]
    if (typeof max !== 'number' || typeof audit?.numericValue !== 'number') continue
    if (audit.numericValue > max) {
      breaches.push({ id, value: audit.numericValue, max, unit: audit.numericUnit ?? '' })
    }
  }
  return breaches
}

function score100(score) {
  return score === null || score === undefined ? 'n/a' : String(Math.round(score * 100))
}

function renderAudit(row, ctx) {
  const { audit } = row
  const isMetric = row.weighted && row.categories.includes('performance')
  const known = fixFor(audit.id) ?? (isMetric ? METRIC_FIX : null)
  const docs = docsLink(audit.description)
  const lines = []
  const tag = row.allowlisted ? ' (allowlisted)' : row.weighted ? '' : ' (diagnostic)'
  lines.push(
    `#### \`${audit.id}\`: score ${score100(audit.score)}${tag}${audit.displayValue ? `, ${cell(audit.displayValue)}` : ''}`
  )
  lines.push('')
  lines.push(`${cell(audit.title, 200)} (${row.categories.join(', ')})`)
  lines.push('')
  if (row.allowlisted)
    lines.push(`Allowlisted in \`.lighthouserc.cjs\`: ${cell(row.allowlisted, 300)}`, '')
  const items = audit.details?.items ?? []
  if (items.length) {
    lines.push('| Element or URL | Measured | Likely source |', '| --- | --- | --- |')
    for (const item of items.slice(0, MAX_ITEMS)) {
      lines.push(
        `| ${itemTarget(item) || 'page'} | ${itemValue(item) || 'see audit'} | ${attributeSource(item, ctx) || 'not attributed'} |`
      )
    }
    if (items.length > MAX_ITEMS)
      lines.push('', `and ${items.length - MAX_ITEMS} more in the HTML report.`)
  } else if (typeof audit.numericValue === 'number') {
    lines.push(
      `Measured: ${cell(audit.displayValue ?? audit.numericValue)} (${Math.round(audit.numericValue)} ${audit.numericUnit ?? ''})`.trim()
    )
  } else {
    lines.push('Measured: whole page (no element details).')
  }
  lines.push('')
  if (known) lines.push(`**Fix** (${known.owner}): ${known.fix}`)
  else
    lines.push(
      '**Fix**: not mapped yet; see the audit docs and add it to `FIXES` in `scripts/lighthouse-report.mjs`.'
    )
  if (docs) lines.push(`Docs: ${docs}`)
  lines.push('')
  return lines.join('\n')
}

/**
 * The markdown report for one theme.
 * @param {{theme: string, themePath?: string, runs: {preset: string, lhr: object}[],
 *   assertions?: object, allowlist?: object[], sources?: Map<string,string>}} input
 */
export function renderReport({
  theme,
  themePath = `examples/${theme}`,
  runs,
  assertions = {},
  allowlist = [],
  sources = new Map(),
}) {
  const ctx = { theme, themePath, sources }
  const out = [`## Lighthouse: ${theme}`, '']
  if (!runs.length) {
    out.push('No Lighthouse results were found. Check the `lhci` steps in the job log.', '')
    return out.join('\n')
  }

  out.push(
    '| Preset | Performance | Accessibility | Best Practices | SEO |',
    '| --- | --- | --- | --- | --- |'
  )
  for (const { preset, lhr } of runs) {
    const c = lhr.categories ?? {}
    out.push(
      `| ${preset} | ${score100(c.performance?.score)} | ${score100(c.accessibility?.score)} | ${score100(c['best-practices']?.score)} | ${score100(c.seo?.score)} |`
    )
  }
  out.push('')

  let clean = true
  for (const { preset, lhr } of runs) {
    const presetAllowlist = allowlist.filter(
      (entry) => !entry.presets || entry.presets.includes(preset)
    )
    const rows = failingAudits(lhr, presetAllowlist)
    const breaches = budgetBreaches(lhr, assertions)
    const weighted = rows.filter((row) => row.weighted)
    if (!weighted.length && !breaches.length) continue
    clean = false
    out.push(`### ${preset}`, '')
    if (breaches.length) {
      out.push('Budget breaches:', '')
      for (const b of breaches) {
        out.push(
          `- \`${b.id}\`: ${Math.round(b.value * 1000) / 1000} ${b.unit} (budget ${b.max})`.trimEnd()
        )
      }
      out.push('')
    }
    for (const row of rows) out.push(renderAudit(row, ctx))
  }
  if (clean) out.push('All categories at 100 and all budgets met on every preset.', '')
  return out.join('\n')
}

/** Representative (median) LHR per preset folder under `dir`. */
export function loadRuns(dir, presets = ['mobile', 'desktop']) {
  const runs = []
  for (const preset of presets) {
    const manifestPath = path.join(dir, preset, 'manifest.json')
    if (!existsSync(manifestPath)) continue
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const entry = manifest.find((run) => run.isRepresentativeRun) ?? manifest[0]
    if (!entry) continue
    const jsonPath = existsSync(entry.jsonPath)
      ? entry.jsonPath
      : path.join(dir, preset, path.basename(entry.jsonPath))
    runs.push({ preset, lhr: JSON.parse(readFileSync(jsonPath, 'utf8')) })
  }
  return runs
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const match = argv[i].match(/^--([a-z]+)(?:=(.*))?$/)
    if (!match) continue
    args[match[1]] = match[2] ?? argv[++i]
  }
  return args
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const theme = args.theme
  if (!theme) {
    console.error(
      'usage: lighthouse-report.mjs --theme <slug> [--dir lighthouse-reports] [--out file.md]'
    )
    process.exit(2)
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const dir = path.resolve(args.dir ?? 'lighthouse-reports')
  const outFile = path.resolve(args.out ?? path.join(dir, 'report.md'))
  const rc = createRequire(import.meta.url)(path.join(root, '.lighthouserc.cjs'))
  const themePath = `examples/${theme}`

  const report = renderReport({
    theme,
    themePath,
    runs: loadRuns(dir, rc.PRESETS),
    assertions: rc.ci.assert.assertions,
    allowlist: rc.ALLOWLIST,
    sources: loadThemeSources(path.join(root, themePath)),
  })
  mkdirSync(path.dirname(outFile), { recursive: true })
  writeFileSync(outFile, report)
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`)
  console.log(report)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
