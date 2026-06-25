#!/usr/bin/env node
/**
 * Extract above-the-fold critical CSS from a rendered page using beasties
 * (no headless browser), and write it to <distDir>/critical/critical.css.
 *
 * The StrataWP core `CriticalCss` component inlines that file into <head> and
 * makes the main stylesheet non-render-blocking.
 *
 * Usage:
 *   node scripts/extract-critical.mjs [url] [distDir] [outFile]
 *
 * Defaults target the example theme served by wp-env:
 *   node scripts/extract-critical.mjs http://localhost:8888/ examples/basic-theme/dist
 */

import Beasties from 'beasties'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const url = process.argv[2] || 'http://localhost:8888/'
const distDir = process.argv[3] || 'examples/basic-theme/dist'
const outFile = process.argv[4] || path.join(distDir, 'critical', 'critical.css')

const res = await fetch(url)
if (!res.ok) {
  console.error(`Failed to fetch ${url}: HTTP ${res.status}`)
  process.exit(1)
}
const html = await res.text()

// Rewrite absolute theme CSS hrefs to dist-relative paths so beasties resolves
// them against `path` (the dist dir) instead of trying to fetch them remotely.
const rewritten = html.replace(
  /href="[^"]*\/dist\/(css\/[^"?]+)(\?[^"]*)?"/g,
  'href="$1"'
)

const beasties = new Beasties({
  path: distDir,
  reduceInlineStyles: false,
  pruneSource: false,
  logLevel: 'silent',
})

const processed = await beasties.process(rewritten)

const match = processed.match(/<style[^>]*>([\s\S]*?)<\/style>/)
const critical = match ? match[1].trim() : ''

if (!critical) {
  console.error('No critical CSS extracted (no <style> in beasties output).')
  process.exit(1)
}

mkdirSync(path.dirname(outFile), { recursive: true })
writeFileSync(outFile, critical)
console.log(`Critical CSS: ${critical.length} bytes -> ${outFile}`)
