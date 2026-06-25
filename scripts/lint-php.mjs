#!/usr/bin/env node
// Runs the core-provided phpcs binary against each cleaned theme location
// using that location's phpcs.xml.dist. Locations are added as they are
// brought to green (spec: "turn the gate on per-location").
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const phpcs = resolve(root, 'packages/core/vendor/bin/phpcs')

// Locations are appended as each is cleaned. Final state: all six.
const LOCATIONS = [
  'packages/cli/templates/basic-theme',
  'examples/basic-theme',
  'packages/cli/templates/store-theme',
  'examples/store-theme',
  'packages/cli/templates/advanced-theme',
  'examples/advanced-theme',
]

if (!existsSync(phpcs)) {
  console.error(`phpcs not found at ${phpcs}. Run "composer install" in packages/core first.`)
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
  process.stdout.write(`\n=== phpcs: ${loc} ===\n`)
  try {
    execFileSync(phpcs, ['--standard=phpcs.xml.dist'], { cwd: dir, stdio: 'inherit' })
  } catch {
    failed = true
  }
}
process.exit(failed ? 1 : 0)
