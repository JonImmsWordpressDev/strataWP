/**
 * contracts:validate — vendored-schema gate for block.json / theme.json
 *
 * Validates every block.json and theme.json in the repo against pinned,
 * vendored JSON Schemas (no live URL fetching — fully deterministic).
 *
 * StrataWP superset rules enforced on top of the WP schema:
 *   1. block.json apiVersion must equal 3.
 *   2. block.json "name" prefix (before "/") must equal the theme's Text Domain
 *      read from that theme's style.css header.
 *   3. If block.json declares "render", the referenced file must exist on disk,
 *      and a dynamic block (one with "render") must have a render.php sibling.
 *
 * EXIT CODES
 *   0  All files pass.
 *   1  One or more files failed.
 *
 * USAGE
 *   pnpm contracts:validate
 */

import Ajv from 'ajv'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'node:fs/promises'

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BLOCK_SCHEMA_PATH = join(ROOT, 'packages/vite-plugin/schemas/block.schema.json')
const THEME_SCHEMA_PATH = join(ROOT, 'packages/vite-plugin/schemas/theme.schema.json')

// ---------------------------------------------------------------------------
// Schema loading
// ---------------------------------------------------------------------------

const blockSchemaRaw = JSON.parse(readFileSync(BLOCK_SCHEMA_PATH, 'utf8'))
const themeSchemaRaw = JSON.parse(readFileSync(THEME_SCHEMA_PATH, 'utf8'))

// Remove $comment before handing to AJV (not a valid JSON Schema keyword)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { $comment: _bc, ...blockSchema } = blockSchemaRaw
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { $comment: _tc, ...themeSchema } = themeSchemaRaw

// The WP theme.json schema uses draft-07 with many $defs/$ref chains.
// Use allErrors + strict:false so unknown keywords (like 'definitions' nested
// refs that AJV 8 is strict about) don't abort early.
const ajv = new Ajv({ allErrors: true, strict: false })

const validateBlockSchema = ajv.compile(blockSchema)
const validateThemeSchema = ajv.compile(themeSchema)

// ---------------------------------------------------------------------------
// Helper: read Text Domain from a theme's style.css
// ---------------------------------------------------------------------------

/**
 * @param {string} themeDir  Absolute path to theme root (has style.css)
 * @returns {string|null}    The text domain, or null if not found
 */
function readTextDomain(themeDir) {
  const stylePath = join(themeDir, 'style.css')
  if (!existsSync(stylePath)) return null
  const content = readFileSync(stylePath, 'utf8')
  const match = content.match(/^Text Domain:\s*(.+)$/im)
  return match ? match[1].trim() : null
}

// ---------------------------------------------------------------------------
// Helper: walk up from a block.json dir to find the theme root
// (the one containing style.css)
// ---------------------------------------------------------------------------

/**
 * @param {string} startDir  Directory to start searching upward from
 * @returns {string|null}    Theme root path, or null if not found
 */
function findThemeRoot(startDir) {
  let dir = startDir
  while (dir !== dirname(dir)) {
    // A WordPress theme root has a style.css with a "Theme Name:" header
    const stylePath = join(dir, 'style.css')
    if (existsSync(stylePath)) {
      const content = readFileSync(stylePath, 'utf8')
      if (/^Theme Name:/im.test(content)) return dir
    }
    dir = dirname(dir)
  }
  return null
}

// ---------------------------------------------------------------------------
// Core validation functions (exported so unit tests can import them)
// ---------------------------------------------------------------------------

/**
 * Validate a parsed block.json object against the vendored WP schema plus the
 * StrataWP superset rules.
 *
 * @param {object}      obj             Parsed block.json content
 * @param {string}      expectedPrefix  Theme text-domain / expected name prefix
 * @param {string|null} blockDir        Directory containing block.json (for render checks)
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateBlockJson(obj, expectedPrefix, blockDir = null) {
  const errors = []

  // 1. WP JSON Schema validation
  const valid = validateBlockSchema(obj)
  if (!valid) {
    for (const err of validateBlockSchema.errors ?? []) {
      errors.push(`Schema: ${err.instancePath || '(root)'} ${err.message}`)
    }
  }

  // 2. StrataWP superset: apiVersion must be 3
  if (obj.apiVersion !== 3) {
    errors.push(`Superset: apiVersion must be 3, got ${JSON.stringify(obj.apiVersion)}`)
  }

  // 3. StrataWP superset: name prefix must match theme slug
  if (typeof obj.name === 'string') {
    const slash = obj.name.indexOf('/')
    const prefix = slash !== -1 ? obj.name.slice(0, slash) : obj.name
    if (prefix !== expectedPrefix) {
      errors.push(
        `Superset: block name prefix "${prefix}" does not match theme slug "${expectedPrefix}"`,
      )
    }
  }

  // 4. StrataWP superset: if render is declared, check file exists + render.php sibling
  if (typeof obj.render === 'string' && blockDir !== null) {
    // render value is like "file:./render.php"
    const renderRel = obj.render.replace(/^file:/, '')
    const renderAbs = resolve(blockDir, renderRel)
    if (!existsSync(renderAbs)) {
      errors.push(`Superset: render file "${obj.render}" does not exist at ${renderAbs}`)
    }
    // Dynamic blocks must have render.php
    const renderPhp = join(blockDir, 'render.php')
    if (!existsSync(renderPhp)) {
      errors.push(`Superset: dynamic block declares render but render.php not found at ${renderPhp}`)
    }
  }

  return { ok: errors.length === 0, errors }
}

/**
 * Validate a parsed theme.json object against the vendored WP schema.
 *
 * @param {object} obj  Parsed theme.json content
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateThemeJson(obj) {
  const errors = []
  const valid = validateThemeSchema(obj)
  if (!valid) {
    for (const err of validateThemeSchema.errors ?? []) {
      errors.push(`Schema: ${err.instancePath || '(root)'} ${err.message}`)
    }
  }
  return { ok: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Discovery helpers
// ---------------------------------------------------------------------------

/**
 * @returns {Promise<string[]>}  Absolute paths to every block.json under
 *   examples/ and packages/cli/templates/ (excluding node_modules)
 */
async function discoverBlockJsonFiles() {
  const patterns = [
    'examples/*/src/blocks/**/block.json',
    'packages/cli/templates/*/src/blocks/**/block.json',
  ]
  const files = []
  for (const pattern of patterns) {
    for await (const f of glob(pattern, { cwd: ROOT })) {
      files.push(join(ROOT, f))
    }
  }
  return files
}

/**
 * @returns {Promise<string[]>}  Absolute paths to every theme.json under
 *   examples/ and packages/cli/templates/ (excluding node_modules)
 */
async function discoverThemeJsonFiles() {
  const patterns = [
    'examples/*/theme.json',
    'packages/cli/templates/*/theme.json',
  ]
  const files = []
  for (const pattern of patterns) {
    for await (const f of glob(pattern, { cwd: ROOT })) {
      files.push(join(ROOT, f))
    }
  }
  return files
}

// ---------------------------------------------------------------------------
// main()
// ---------------------------------------------------------------------------

export async function main() {
  let totalFiles = 0
  let failures = 0

  console.log('[contracts:validate] Starting block.json / theme.json validation…\n')

  // --- block.json ---
  const blockFiles = await discoverBlockJsonFiles()
  for (const filePath of blockFiles) {
    totalFiles++
    const rel = relative(ROOT, filePath)
    let obj
    try {
      obj = JSON.parse(readFileSync(filePath, 'utf8'))
    } catch (e) {
      console.error(`  FAIL  ${rel}\n        Parse error: ${e.message}`)
      failures++
      continue
    }

    const blockDir = dirname(filePath)
    const themeRoot = findThemeRoot(blockDir)
    const slug = themeRoot ? readTextDomain(themeRoot) : null
    const expectedPrefix = slug ?? '(unknown)'

    const { ok, errors } = validateBlockJson(obj, expectedPrefix, blockDir)
    if (ok) {
      console.log(`  PASS  ${rel}`)
    } else {
      console.error(`  FAIL  ${rel}`)
      for (const e of errors) {
        console.error(`        ${e}`)
      }
      failures++
    }
  }

  // --- theme.json ---
  const themeFiles = await discoverThemeJsonFiles()
  for (const filePath of themeFiles) {
    totalFiles++
    const rel = relative(ROOT, filePath)
    let obj
    try {
      obj = JSON.parse(readFileSync(filePath, 'utf8'))
    } catch (e) {
      console.error(`  FAIL  ${rel}\n        Parse error: ${e.message}`)
      failures++
      continue
    }

    const { ok, errors } = validateThemeJson(obj)
    if (ok) {
      console.log(`  PASS  ${rel}`)
    } else {
      console.error(`  FAIL  ${rel}`)
      for (const e of errors) {
        console.error(`        ${e}`)
      }
      failures++
    }
  }

  console.log(
    `\n[contracts:validate] ${totalFiles} files checked, ${failures} failed.`,
  )

  if (failures > 0) {
    process.exit(1)
  }
}

// Run when invoked directly (not imported as a module)
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error('[contracts:validate] Unexpected error:', err)
    process.exit(1)
  })
}
