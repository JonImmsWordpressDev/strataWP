/**
 * Refresh each bundled template's vendored stratawp/core from packages/core.
 *
 * The templates ship a snapshot of core in vendor/stratawp/core (vendor/ is
 * gitignored, so it exists only on disk). Runs automatically via the cli
 * package's `prepack` hook so every published tarball carries current core —
 * previously the snapshot silently rotted (issue #26's stale Assets.php
 * shipped for months).
 */

import { cp, rm, access, readFile, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { assertPublishableVersion } from './template-deps.mjs'

const cliRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const coreRoot = join(cliRoot, '..', 'core')
const templates = ['basic-theme', 'advanced-theme', 'store-theme']

try {
  await access(join(coreRoot, 'src'))
} catch {
  console.error('sync-template-vendor: packages/core/src not found — run from the monorepo')
  process.exit(1)
}

for (const template of templates) {
  const target = join(cliRoot, 'templates', template, 'vendor', 'stratawp', 'core')
  await rm(join(target, 'src'), { recursive: true, force: true })
  await cp(join(coreRoot, 'src'), join(target, 'src'), { recursive: true })
  for (const file of ['composer.json', 'README.md']) {
    await cp(join(coreRoot, file), join(target, file))
  }
  console.log(`sync-template-vendor: refreshed ${template}/vendor/stratawp/core`)
}

// Stamp the versions of the workspace packages templates depend on into the
// cli's templateDependencies. Templates declare workspace:*, which only
// resolves inside this monorepo; customize-theme.ts rewrites it on scaffold
// using this field, so each pin must track its package instead of being
// hardcoded.
const cliPkgPath = join(cliRoot, 'package.json')
const cliPkg = JSON.parse(await readFile(cliPkgPath, 'utf8'))
const templatePackages = {
  '@stratawp/vite-plugin': 'vite-plugin',
  '@stratawp/stylelint-config': 'stylelint-config',
  '@stratawp/testing': 'testing',
}

let changed = false
const stamped = { ...cliPkg.templateDependencies }
for (const [name, dir] of Object.entries(templatePackages)) {
  const pkg = JSON.parse(await readFile(join(cliRoot, '..', dir, 'package.json'), 'utf8'))
  try {
    assertPublishableVersion(name, pkg.version)
  } catch (error) {
    console.error(`sync-template-vendor: ${error.message}`)
    process.exit(1)
  }
  const wanted = `^${pkg.version}`
  if (stamped[name] !== wanted) {
    stamped[name] = wanted
    changed = true
    console.log(`sync-template-vendor: pinned ${name} ${wanted} in templateDependencies`)
  }
}
if (changed) {
  cliPkg.templateDependencies = stamped
  await writeFile(cliPkgPath, JSON.stringify(cliPkg, null, 2) + '\n')
}
