#!/usr/bin/env node
// Runs the StrataWP theme review over every theme location in this repo.
// Requires a prior build of @stratawp/theme-review (pnpm build).
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cli = resolve(root, 'packages/theme-review/dist/cli.js')

const LOCATIONS = [
  'packages/cli/templates/basic-theme',
  'examples/basic-theme',
  'packages/cli/templates/store-theme',
  'examples/store-theme',
  'packages/cli/templates/advanced-theme',
  'examples/advanced-theme',
]

if (!existsSync(cli)) {
  console.error(`Theme review is not built (${cli} not found). Run "pnpm build" first.`)
  process.exit(1)
}

let failed = false
for (const loc of LOCATIONS) {
  const dir = resolve(root, loc)
  if (!existsSync(dir)) {
    console.error(`Location not found: ${loc}`)
    failed = true
    continue
  }
  process.stdout.write(`\n=== review: ${loc} ===\n`)
  try {
    execFileSync(process.execPath, [cli, dir], { stdio: 'inherit' })
  } catch {
    failed = true
  }
}
process.exit(failed ? 1 : 0)
