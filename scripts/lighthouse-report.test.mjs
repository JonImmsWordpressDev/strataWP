import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  attributeSource,
  budgetBreaches,
  cell,
  failingAudits,
  itemValue,
  loadRuns,
  loadThemeSources,
  presetSlugs,
  renderReport,
  themeClasses,
} from './lighthouse-report.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const require = createRequire(import.meta.url)

// Real Lighthouse 12.1.0 results (trimmed) of a static page with known gaps.
const fixture = (preset) =>
  JSON.parse(readFileSync(path.join(here, '__fixtures__', `lhr-${preset}.json`), 'utf8'))

test('failingAudits lists weighted audits under 1, deduped across categories', () => {
  const rows = failingAudits(fixture('mobile'))
  const ids = rows.map((row) => row.audit.id)
  assert.ok(ids.includes('color-contrast'))
  assert.ok(ids.includes('meta-description'))
  assert.equal(ids.filter((id) => id === 'image-alt').length, 1)
  const imageAlt = rows.find((row) => row.audit.id === 'image-alt')
  assert.deepEqual(imageAlt.categories, ['accessibility', 'seo'])
  // Performance is 100 in the fixture, so its weight-0 diagnostics stay out.
  assert.ok(!ids.includes('uses-long-cache-ttl'))
  assert.ok(rows.every((row) => row.weighted))
})

test('failingAudits includes performance diagnostics when performance is under 100', () => {
  const lhr = fixture('mobile')
  lhr.categories.performance.score = 0.9
  const rows = failingAudits(lhr)
  const cache = rows.find((row) => row.audit.id === 'uses-long-cache-ttl')
  assert.ok(cache)
  assert.equal(cache.weighted, false)
  assert.ok(rows.findIndex((row) => !row.weighted) > rows.findIndex((row) => row.weighted))
})

test('failingAudits marks allowlisted audits with their reason', () => {
  const rows = failingAudits(fixture('mobile'), [
    { audit: 'meta-description', reason: 'SEO plugin' },
  ])
  assert.equal(rows.find((row) => row.audit.id === 'meta-description').allowlisted, 'SEO plugin')
})

test('budgetBreaches compares numeric values to maxNumericValue assertions', () => {
  const lhr = fixture('mobile')
  lhr.audits['largest-contentful-paint'].numericValue = 2600
  const breaches = budgetBreaches(lhr, {
    'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
    'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
    'categories:seo': ['error', { minScore: 1 }],
    'some-audit': 'off',
  })
  assert.deepEqual(breaches, [
    { id: 'largest-contentful-paint', value: 2600, max: 2000, unit: 'millisecond' },
  ])
})

test('itemValue takes the measured value from the axe explanation', () => {
  const item = fixture('mobile').audits['color-contrast'].details.items[0]
  assert.match(itemValue(item), /contrast of 1\.91 \(foreground color: #bbbbbb/)
  assert.doesNotMatch(itemValue(item), /Fix any of the following/)
})

test('itemValue reports byte savings and image sizes', () => {
  assert.equal(itemValue({ url: 'x', wastedBytes: 2048 }), '2 KiB wasted')
  assert.equal(
    itemValue({ url: 'x', displayedSize: '10x10', actualSize: '5x5', expectedSize: '20x20' }),
    'displayed 10x10, actual 5x5, expected 20x20'
  )
})

test('themeClasses keeps custom classes and drops core and preset ones', () => {
  assert.deepEqual(
    themeClasses(
      '<div class="wp-block-group is-layout-flow has-primary-color hero-card alignfull">'
    ),
    ['hero-card']
  )
  assert.deepEqual(
    presetSlugs('<p class="has-muted-color has-text-color has-base-background-color">'),
    ['color `muted`', 'color `base`']
  )
})

test('attributeSource maps URLs to theme, core, plugin and third parties', () => {
  const ctx = { theme: 'basic-theme', themePath: 'examples/basic-theme' }
  const at = (url) => attributeSource({ url }, ctx)
  assert.match(
    at('http://localhost:8888/wp-content/themes/basic-theme/dist/css/main-abc.css'),
    /theme build `dist\/css\/main-abc\.css` \(source under `examples\/basic-theme\/src\/`\)/
  )
  assert.equal(
    at('http://localhost:8888/wp-content/themes/basic-theme/vendor/stratawp/core/x.js'),
    'stratawp/core asset'
  )
  assert.equal(
    at('http://localhost:8888/wp-includes/css/dist/block-library/style.min.css'),
    'WordPress core asset'
  )
  assert.equal(at('http://localhost:8888/wp-content/plugins/akismet/a.js'), 'plugin `akismet`')
  assert.equal(at('https://secure.gravatar.com/avatar/abc'), 'third party (`secure.gravatar.com`)')
})

test('attributeSource finds the theme file that owns a custom class', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'lh-theme-'))
  mkdirSync(path.join(dir, 'patterns'))
  mkdirSync(path.join(dir, 'node_modules'))
  writeFileSync(path.join(dir, 'patterns', 'hero.php'), '<div class="hero-card">')
  writeFileSync(path.join(dir, 'node_modules', 'x.js'), 'hero-card')
  writeFileSync(path.join(dir, 'theme.json'), '{}')
  const sources = loadThemeSources(dir)
  assert.deepEqual([...sources.keys()].sort(), ['patterns/hero.php', 'theme.json'])
  const ctx = { theme: 't', themePath: 'examples/t', sources }
  assert.equal(
    attributeSource({ node: { snippet: '<div class="wp-block-group hero-card">' } }, ctx),
    '`examples/t/patterns/hero.php`'
  )
  assert.equal(
    attributeSource({ node: { snippet: '<h1 class="has-muted-color has-text-color">' } }, ctx),
    '`examples/t/theme.json` preset color `muted`'
  )
  assert.equal(
    attributeSource({ node: { snippet: '<a class="wp-block-site-title">' } }, ctx),
    'core block `site-title` markup in a template, part or pattern'
  )
})

test('cell escapes pipes and truncates', () => {
  assert.equal(cell('a | b'), 'a \\| b')
  assert.equal(cell('x'.repeat(10), 5), 'xxxx…')
})

test('loadRuns reads the representative run from each preset manifest', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'lh-runs-'))
  for (const preset of ['mobile', 'desktop']) {
    mkdirSync(path.join(dir, preset))
    const lhr = fixture(preset)
    writeFileSync(path.join(dir, preset, 'median.report.json'), JSON.stringify(lhr))
    writeFileSync(path.join(dir, preset, 'other.report.json'), JSON.stringify({ categories: {} }))
    // The manifest stores absolute paths from the CI runner; fall back to the folder.
    writeFileSync(
      path.join(dir, preset, 'manifest.json'),
      JSON.stringify([
        { isRepresentativeRun: false, jsonPath: '/ci/other.report.json' },
        { isRepresentativeRun: true, jsonPath: '/ci/median.report.json' },
      ])
    )
  }
  const runs = loadRuns(dir)
  assert.deepEqual(
    runs.map((run) => run.preset),
    ['mobile', 'desktop']
  )
  assert.equal(runs[0].lhr.configSettings.formFactor, 'mobile')
  assert.equal(runs[1].lhr.configSettings.formFactor, 'desktop')
})

test('renderReport names every failing audit with evidence and a fix', () => {
  const report = renderReport({
    theme: 'basic-theme',
    runs: [
      { preset: 'mobile', lhr: fixture('mobile') },
      { preset: 'desktop', lhr: fixture('desktop') },
    ],
  })
  assert.match(report, /^## Lighthouse: basic-theme/)
  assert.match(report, /\| mobile \| 100 \| 42 \| 86 \| 82 \|/)
  assert.match(report, /### mobile/)
  assert.match(report, /### desktop/)
  assert.match(report, /#### `color-contrast`: score 0/)
  assert.match(report, /`examples\/basic-theme\/theme\.json` preset color `muted`/)
  assert.match(report, /\*\*Fix\*\* \(theme\): Raise the contrast/)
  assert.match(report, /#### `meta-description`: score 0/)
  assert.match(
    report,
    /Docs: https:\/\/developer\.chrome\.com\/docs\/lighthouse\/seo\/meta-description\//
  )
})

test('renderReport reports a clean run and an empty one', () => {
  const lhr = fixture('mobile')
  for (const category of Object.values(lhr.categories)) category.score = 1
  for (const audit of Object.values(lhr.audits)) if (audit.score !== null) audit.score = 1
  assert.match(
    renderReport({ theme: 't', runs: [{ preset: 'mobile', lhr }] }),
    /All categories at 100 and all budgets met/
  )
  assert.match(renderReport({ theme: 't', runs: [] }), /No Lighthouse results were found/)
})

test('.lighthouserc.cjs asserts 100 in every category and keeps the budgets', () => {
  const rc = require(path.join(root, '.lighthouserc.cjs'))
  const { assertions } = rc.ci.assert
  for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
    const floor = rc.ALLOWLIST.filter((entry) => entry.category === category).reduce(
      (min, entry) => Math.min(min, entry.minScore),
      1
    )
    assert.deepEqual(assertions[`categories:${category}`], ['error', { minScore: floor }])
  }
  assert.equal(assertions['largest-contentful-paint'][1].maxNumericValue, 2000)
  assert.equal(assertions['cumulative-layout-shift'][1].maxNumericValue, 0.1)
  assert.equal(assertions['total-blocking-time'][1].maxNumericValue, 200)
  assert.deepEqual(rc.PRESETS, ['mobile', 'desktop'])
  for (const entry of rc.ALLOWLIST) {
    assert.ok(entry.audit && entry.category && entry.reason, 'allowlist entries need a reason')
    assert.ok(entry.minScore < 1)
    assert.equal(assertions[entry.audit], 'off')
  }
})
