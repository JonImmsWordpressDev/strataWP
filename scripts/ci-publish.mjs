#!/usr/bin/env node
/**
 * CI publisher for npm trusted publishing (OIDC).
 *
 * `pnpm -r publish` skips already-published versions but pnpm 8 predates
 * npm's OIDC support, and plain `npm publish` doesn't rewrite workspace:
 * ranges. So: pack with pnpm (rewrites workspace: -> real semver ranges),
 * publish the tarball with npm >= 11.5.1 (exchanges the Actions OIDC token
 * for credentials — no NPM_TOKEN secret to rotate). Each public package must
 * list this repo + workflow file as a trusted publisher on npmjs.com.
 */
import { execSync, spawnSync } from 'child_process'
import { readdirSync, readFileSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const dryRun = process.argv.includes('--dry-run')
const root = process.cwd()
let failed = false

// The CLI bundles templates that pin the other packages' versions, and
// create-stratawp wraps the CLI, so both publish last. If anything else fails,
// they are skipped: a published CLI must never point at a version that is
// missing from the registry.
const LAST = ['cli', 'create-stratawp']
const dirs = readdirSync('packages').sort((a, b) => LAST.indexOf(a) - LAST.indexOf(b))

for (const dir of dirs) {
  if (failed && LAST.includes(dir)) {
    console.error(`skip packages/${dir}: a package it depends on failed to publish`)
    continue
  }
  const pkgDir = join(root, 'packages', dir)
  let pkg
  try {
    pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
  } catch {
    continue
  }
  if (pkg.private === true) {
    console.log(`skip ${pkg.name} (private)`)
    continue
  }
  const spec = `${pkg.name}@${pkg.version}`
  // Non-empty stdout means this exact version is on the registry. A missing
  // version on an existing package exits 0 with empty output, so test the
  // output rather than the exit code.
  const view = spawnSync('npm', ['view', spec, 'version'], { encoding: 'utf8' })
  if (view.stdout.trim()) {
    console.log(`skip ${spec} (already on registry)`)
    continue
  }
  if (dryRun) {
    console.log(`would publish ${spec}`)
    continue
  }
  console.log(`publishing ${spec}`)
  const packDir = mkdtempSync(join(tmpdir(), 'stratawp-pack-'))
  try {
    execSync(`pnpm pack --pack-destination "${packDir}"`, { cwd: pkgDir, stdio: 'inherit' })
    const tarball = readdirSync(packDir).find((f) => f.endsWith('.tgz'))
    execSync(`npm publish "${join(packDir, tarball)}" --access public`, {
      cwd: pkgDir,
      stdio: 'inherit',
    })
  } catch (e) {
    console.error(`FAILED ${spec}: ${e.message}`)
    failed = true
  } finally {
    rmSync(packDir, { recursive: true, force: true })
  }
}
process.exit(failed ? 1 : 0)
